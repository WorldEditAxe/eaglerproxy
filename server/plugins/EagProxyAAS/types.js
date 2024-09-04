export var ConnectionState;
(function (ConnectionState) {
    ConnectionState[ConnectionState["AUTH"] = 0] = "AUTH";
    ConnectionState[ConnectionState["SUCCESS"] = 1] = "SUCCESS";
    ConnectionState[ConnectionState["DISCONNECTED"] = 2] = "DISCONNECTED";
})(ConnectionState || (ConnectionState = {}));
export var ChatColor;
(function (ChatColor) {
    ChatColor["BLACK"] = "\u00A70";
    ChatColor["DARK_BLUE"] = "\u00A71";
    ChatColor["DARK_GREEN"] = "\u00A72";
    ChatColor["DARK_CYAN"] = "\u00A73";
    ChatColor["DARK_RED"] = "\u00A74";
    ChatColor["PURPLE"] = "\u00A75";
    ChatColor["GOLD"] = "\u00A76";
    ChatColor["GRAY"] = "\u00A77";
    ChatColor["DARK_GRAY"] = "\u00A78";
    ChatColor["BLUE"] = "\u00A79";
    ChatColor["BRIGHT_GREEN"] = "\u00A7a";
    ChatColor["CYAN"] = "\u00A7b";
    ChatColor["RED"] = "\u00A7c";
    ChatColor["PINK"] = "\u00A7d";
    ChatColor["YELLOW"] = "\u00A7e";
    ChatColor["WHITE"] = "\u00A7f";
    // text styling
    ChatColor["OBFUSCATED"] = "\u00A7k";
    ChatColor["BOLD"] = "\u00A7l";
    ChatColor["STRIKETHROUGH"] = "\u00A7m";
    ChatColor["UNDERLINED"] = "\u00A7n";
    ChatColor["ITALIC"] = "\u00A7o";
    ChatColor["RESET"] = "\u00A7r";
})(ChatColor || (ChatColor = {}));
export var ConnectType;
(function (ConnectType) {
    ConnectType["ONLINE"] = "ONLINE";
    ConnectType["OFFLINE"] = "OFFLINE";
    ConnectType["EASYMC"] = "EASYMC";
})(ConnectType || (ConnectType = {}));
