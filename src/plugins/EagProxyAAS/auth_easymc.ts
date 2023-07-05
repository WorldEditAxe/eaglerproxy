import mc from "minecraft-protocol";
import { Enums } from "../../proxy/Enums.js";

export async function getTokenProfileEasyMc(token: string): Promise<object> {
  const fetchOptions = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
    }),
  };
  const res = await fetch(
    "https://api.easymc.io/v1/token/redeem",
    fetchOptions
  );
  const resJson = await res.json();

  if (resJson.error)
    throw new Error(Enums.ChatColor.RED + `EasyMC: ${resJson.error}`);
  if (!resJson)
    throw new Error(
      Enums.ChatColor.RED + "EasyMC replied with an empty response!?"
    );
  if (
    resJson.session?.length !== 43 ||
    resJson.mcName?.length < 3 ||
    resJson.uuid?.length !== 36
  )
    throw new Error(
      Enums.ChatColor.RED + "Invalid response from EasyMC received!"
    );
  return {
    auth: "mojang",
    sessionServer: "https://sessionserver.easymc.io",
    username: resJson.mcName,
    haveCredentials: true,
    session: {
      accessToken: resJson.session,
      selectedProfile: {
        name: resJson.mcName,
        id: resJson.uuid,
      },
    },
  };
}

async function easyMcAuth(client, options) {
  const fetchOptions = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: options.easyMcToken,
    }),
  };
  try {
    const res = await fetch(
      "https://api.easymc.io/v1/token/redeem",
      fetchOptions
    );
    const resJson = await res.json();
    if (resJson.error)
      throw new Error(Enums.ChatColor.RED + `EasyMC: ${resJson.error}`);
    if (!resJson)
      throw new Error(
        Enums.ChatColor.RED + "EasyMC replied with an empty response!?"
      );
    if (
      resJson.session?.length !== 43 ||
      resJson.mcName?.length < 3 ||
      resJson.uuid?.length !== 36
    )
      throw new Error(
        Enums.ChatColor.RED + "Invalid response from EasyMC received!"
      );
    const session = {
      accessToken: resJson.session,
      selectedProfile: {
        name: resJson.mcName,
        id: resJson.uuid,
      },
    };
    options.haveCredentials = true;
    client.session = session;
    options.username = client.username = session.selectedProfile.name;
    options.accessToken = session.accessToken;
    client.emit("session", session);
  } catch (error) {
    client.emit("error", error);
    return;
  }
  options.connect(client);
}

function getEasyMcClientOptions(token: string) {
  if (token.length !== 20) {
    throw new Error(
      Enums.ChatColor.RED +
        "EasyMC authentication requires an alt token. See https://easymc.io/get ."
    );
  }

  return {
    auth: easyMcAuth,
    easyMcToken: token,
    sessionServer: "https://sessionserver.easymc.io",
    username: Buffer.alloc(0),
  };
}
