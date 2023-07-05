import fs from "fs";
import path from "path";
import crypto from "crypto";

import { createHash } from "prismarine-auth/src/common/Util.js";
import Constants from "prismarine-auth/src/common/Constants.js";
const { Endpoints, msalConfig } = Constants;

import LiveTokenManager from "prismarine-auth/src/TokenManagers/LiveTokenManager.js";
import JavaTokenManager from "prismarine-auth/src/TokenManagers/MinecraftJavaTokenManager.js";
import XboxTokenManager from "prismarine-auth/src/TokenManagers/XboxTokenManager.js";
import MsaTokenManager from "prismarine-auth/src/TokenManagers/MsaTokenManager.js";
import BedrockTokenManager from "prismarine-auth/src/TokenManagers/MinecraftBedrockTokenManager.js";

/*
MIT License

Copyright (c) 2020 PrismarineJS

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

async function retry(methodFn, beforeRetry, times) {
  for (let attempts = 0; attempts < times; attempts++) {
    try {
      return await methodFn();
    } catch (err) {
      if (err instanceof URIError) {
        throw err;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await beforeRetry();
  }
}

export class CustomAuthflow {
  username: string;
  options: any;
  codeCallback: any;
  msa: any;
  doTitleAuth: boolean;
  xbl: any;
  mba: any;
  mca: any;

  constructor(username = "", cache, options, codeCallback) {
    this.username = username;
    if (options && !options.flow) {
      throw new Error(
        "Missing 'flow' argument in options. See docs for more information."
      );
    }
    this.options = options || { flow: "msal" };
    this.initTokenManagers(username, cache);
    this.codeCallback = codeCallback;
  }

  initTokenManagers(username, cache) {
    if (this.options.flow === "live" || this.options.flow === "sisu") {
      if (!this.options.authTitle)
        throw new Error(
          `Please specify an "authTitle" in Authflow constructor when using ${this.options.flow} flow`
        );
      this.msa = new LiveTokenManager(
        this.options.authTitle,
        ["service::user.auth.xboxlive.com::MBI_SSL"],
        cache({ cacheName: this.options.flow, username })
      );
      this.doTitleAuth = true;
    } else if (this.options.flow === "msal") {
      const config = Object.assign(
        { ...msalConfig },
        this.options.authTitle
          ? { auth: { ...msalConfig.auth, clientId: this.options.authTitle } }
          : {}
      );
      this.msa = new MsaTokenManager(
        config,
        ["XboxLive.signin", "offline_access"],
        cache({ cacheName: "msal", username })
      );
    } else {
      throw new Error(
        `Unknown flow: ${this.options.flow} (expected "live", "sisu", or "msal")`
      );
    }

    const keyPair = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
    this.xbl = new XboxTokenManager(
      keyPair,
      cache({ cacheName: "xbl", username })
    );
    this.mba = new BedrockTokenManager(cache({ cacheName: "bed", username }));
    this.mca = new JavaTokenManager(cache({ cacheName: "mca", username }));
  }

  static resetTokenCaches(cache) {
    if (!cache) throw new Error("You must provide a cache directory to reset.");
    if (fs.existsSync(cache)) {
      fs.rmSync(cache, { recursive: true });
      return true;
    }
  }

  async getMsaToken() {
    if (await this.msa.verifyTokens()) {
      const { token } = await this.msa.getAccessToken();
      return token;
    } else {
      const ret = await this.msa.authDeviceCode((response) => {
        if (this.codeCallback) return this.codeCallback(response);
        console.info("[msa] First time signing in. Please authenticate now:");
        console.info(response.message);
      });

      return ret.accessToken;
    }
  }

  async getXboxToken(
    relyingParty = this.options.relyingParty || Endpoints.XboxRelyingParty
  ) {
    const options = { ...this.options, relyingParty };
    if (await this.xbl.verifyTokens(relyingParty)) {
      const { data } = await this.xbl.getCachedXstsToken(relyingParty);
      return data;
    } else if (options.password) {
      const xsts = await this.xbl.doReplayAuth(
        this.username,
        options.password,
        options
      );
      return xsts;
    } else {
      return await retry(
        async () => {
          const msaToken = await this.getMsaToken();

          if (options.flow === "sisu") {
            const deviceToken = await this.xbl.getDeviceToken(options);
            const sisu = await this.xbl.doSisuAuth(
              msaToken,
              deviceToken,
              options
            );
            return sisu;
          }

          const userToken = await this.xbl.getUserToken(
            msaToken,
            options.flow === "msal"
          );

          if (this.doTitleAuth) {
            const deviceToken = await this.xbl.getDeviceToken(options);
            const titleToken = await this.xbl.getTitleToken(
              msaToken,
              deviceToken
            );
            const xsts = await this.xbl.getXSTSToken(
              { userToken, deviceToken, titleToken },
              options
            );
            return xsts;
          } else {
            const xsts = await this.xbl.getXSTSToken({ userToken }, options);
            return xsts;
          }
        },
        () => {
          this.msa.forceRefresh = true;
        },
        2
      );
    }
  }

  async getMinecraftJavaToken(options: any = {}) {
    const response: any = { token: "", entitlements: {}, profile: {} };
    if (await this.mca.verifyTokens()) {
      const { token } = await this.mca.getCachedAccessToken();
      response.token = token;
    } else {
      await retry(
        async () => {
          const xsts = await this.getXboxToken(Endpoints.PCXSTSRelyingParty);
          response.token = await this.mca.getAccessToken(xsts);
        },
        () => {
          this.xbl.forceRefresh = true;
        },
        2
      );
    }

    if (options.fetchEntitlements) {
      response.entitlements = await this.mca.fetchEntitlements(response.token);
    }
    if (options.fetchProfile) {
      response.profile = await this.mca.fetchProfile(response.token);
    }
    if (options.fetchCertificates) {
      response.certificates = await this.mca.fetchCertificates(response.token);
    }

    return response;
  }
}
