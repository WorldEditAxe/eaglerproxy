import { Enums } from "./Enums.js";
export var Chat;
(function (Chat) {
    function chatToPlainString(chat) {
        let ret = "";
        if (chat.text != null)
            ret += chat.text;
        if (chat.extra != null) {
            chat.extra.forEach((extra) => {
                let append = "";
                if (extra.bold)
                    append += Enums.ChatColor.BOLD;
                if (extra.italic)
                    append += Enums.ChatColor.ITALIC;
                if (extra.underlined)
                    append += Enums.ChatColor.UNDERLINED;
                if (extra.strikethrough)
                    append += Enums.ChatColor.STRIKETHROUGH;
                if (extra.obfuscated)
                    append += Enums.ChatColor.OBFUSCATED;
                if (extra.color)
                    append +=
                        extra.color == "reset"
                            ? Enums.ChatColor.RESET
                            : resolveColor(extra.color);
                append += extra.text;
                ret += append;
            });
        }
        return ret;
    }
    Chat.chatToPlainString = chatToPlainString;
    const ccValues = Object.values(Enums.ChatColor);
    const ccKeys = Object.keys(Enums.ChatColor).map((str) => str.toLowerCase());
    function resolveColor(colorStr) {
        return (Object.values(Enums.ChatColor)[ccKeys.indexOf(colorStr.toLowerCase())] ??
            colorStr);
    }
})(Chat || (Chat = {}));
