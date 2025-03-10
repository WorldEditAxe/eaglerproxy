import mc from "minecraft-protocol";
import { Enums } from "../../proxy/Enums.js";

export async function getTokenProfileTheAltening(token: string): Promise<object> {
  const fetchOptions = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: token,
      password: "anything",
    }),
  };
  const res = await fetch("http://authserver.thealtening.com/authenticate", fetchOptions);
  const resJson = await res.json();

  if (resJson.error) throw new Error(Enums.ChatColor.RED + `${resJson.error}`);
  if (!resJson) throw new Error(Enums.ChatColor.RED + "TheAltening replied with an empty response!?");
  if (resJson.selectedProfile?.name?.length < 3) throw new Error(Enums.ChatColor.RED + "Invalid response from TheAltening received!");
  return {
    auth: "mojang",
    sessionServer: "http://sessionserver.thealtening.com",
    username: resJson.selectedProfile.name,
    haveCredentials: true,
    session: resJson,
  };
}
