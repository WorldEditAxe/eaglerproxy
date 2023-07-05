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

  if (resJson.error) throw new Error(Enums.ChatColor.RED + `${resJson.error}`);
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
