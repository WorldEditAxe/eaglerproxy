export var Enums;
(function (Enums) {
    let PacketId;
    (function (PacketId) {
        PacketId[PacketId["CSLoginPacket"] = 1] = "CSLoginPacket";
        PacketId[PacketId["SCIdentifyPacket"] = 2] = "SCIdentifyPacket";
        PacketId[PacketId["SCDisconnectPacket"] = 255] = "SCDisconnectPacket";
        PacketId[PacketId["SCChannelMessagePacket"] = 63] = "SCChannelMessagePacket";
        PacketId[PacketId["CSChannelMessagePacket"] = 23] = "CSChannelMessagePacket";
        PacketId[PacketId["CSUsernamePacket"] = 4] = "CSUsernamePacket";
        PacketId[PacketId["SCSyncUuidPacket"] = 5] = "SCSyncUuidPacket";
        PacketId[PacketId["CSSetSkinPacket"] = 7] = "CSSetSkinPacket";
        PacketId[PacketId["CSReadyPacket"] = 8] = "CSReadyPacket";
        PacketId[PacketId["SCReadyPacket"] = 9] = "SCReadyPacket";
    })(PacketId = Enums.PacketId || (Enums.PacketId = {}));
    let ChannelMessageType;
    (function (ChannelMessageType) {
        ChannelMessageType[ChannelMessageType["CLIENT"] = 23] = "CLIENT";
        ChannelMessageType[ChannelMessageType["SERVER"] = 63] = "SERVER";
    })(ChannelMessageType = Enums.ChannelMessageType || (Enums.ChannelMessageType = {}));
    let EaglerSkinPacketId;
    (function (EaglerSkinPacketId) {
        EaglerSkinPacketId[EaglerSkinPacketId["CFetchSkinEaglerPlayerReq"] = 3] = "CFetchSkinEaglerPlayerReq";
        EaglerSkinPacketId[EaglerSkinPacketId["SFetchSkinBuiltInRes"] = 4] = "SFetchSkinBuiltInRes";
        EaglerSkinPacketId[EaglerSkinPacketId["SFetchSkinRes"] = 5] = "SFetchSkinRes";
        EaglerSkinPacketId[EaglerSkinPacketId["CFetchSkinReq"] = 6] = "CFetchSkinReq";
    })(EaglerSkinPacketId = Enums.EaglerSkinPacketId || (Enums.EaglerSkinPacketId = {}));
    let ClientState;
    (function (ClientState) {
        ClientState["PRE_HANDSHAKE"] = "PRE_HANDSHAKE";
        ClientState["POST_HANDSHAKE"] = "POST_HANDSHAKE";
        ClientState["DISCONNECTED"] = "DISCONNECTED";
    })(ClientState = Enums.ClientState || (Enums.ClientState = {}));
    let PacketBounds;
    (function (PacketBounds) {
        PacketBounds["C"] = "C";
        PacketBounds["S"] = "S";
    })(PacketBounds = Enums.PacketBounds || (Enums.PacketBounds = {}));
    let SkinType;
    (function (SkinType) {
        SkinType[SkinType["BUILTIN"] = 0] = "BUILTIN";
        SkinType[SkinType["CUSTOM"] = 1] = "CUSTOM";
    })(SkinType = Enums.SkinType || (Enums.SkinType = {}));
    let ChatColor;
    (function (ChatColor) {
        ChatColor["AQUA"] = "\u00A7b";
        ChatColor["BLACK"] = "\u00A70";
        ChatColor["DARK_BLUE"] = "\u00A71";
        ChatColor["DARK_GREEN"] = "\u00A72";
        ChatColor["DARK_CYAN"] = "\u00A73";
        ChatColor["DARK_RED"] = "\u00A74";
        ChatColor["PURPLE"] = "\u00A75";
        ChatColor["GOLD"] = "\u00A76";
        ChatColor["GRAY"] = "\u00A77";
        ChatColor["GREEN"] = "\u00A7a";
        ChatColor["DARK_GRAY"] = "\u00A78";
        ChatColor["BLUE"] = "\u00A79";
        ChatColor["BRIGHT_GREEN"] = "\u00A7a";
        ChatColor["LIGHT_PURPLE"] = "\u00A7d";
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
    })(ChatColor = Enums.ChatColor || (Enums.ChatColor = {}));
})(Enums || (Enums = {}));
