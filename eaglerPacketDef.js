export var EaglerPacketId;
(function (EaglerPacketId) {
    EaglerPacketId[EaglerPacketId["IDENTIFY_CLIENT"] = 1] = "IDENTIFY_CLIENT";
    EaglerPacketId[EaglerPacketId["IDENTIFY_SERVER"] = 2] = "IDENTIFY_SERVER";
    EaglerPacketId[EaglerPacketId["LOGIN"] = 4] = "LOGIN";
    EaglerPacketId[EaglerPacketId["LOGIN_ACK"] = 5] = "LOGIN_ACK";
    EaglerPacketId[EaglerPacketId["SKIN"] = 7] = "SKIN";
    EaglerPacketId[EaglerPacketId["C_READY"] = 8] = "C_READY";
    EaglerPacketId[EaglerPacketId["COMPLETE_HANDSHAKE"] = 9] = "COMPLETE_HANDSHAKE";
    EaglerPacketId[EaglerPacketId["DISCONNECT"] = 255] = "DISCONNECT";
})(EaglerPacketId || (EaglerPacketId = {}));
export var DisconnectReason;
(function (DisconnectReason) {
    DisconnectReason[DisconnectReason["UNEXPECTED_PACKET"] = 1] = "UNEXPECTED_PACKET";
    DisconnectReason[DisconnectReason["DUPLICATE_USERNAME"] = 2] = "DUPLICATE_USERNAME";
    DisconnectReason[DisconnectReason["BAD_USERNAME"] = 3] = "BAD_USERNAME";
    DisconnectReason[DisconnectReason["SERVER_DISCONNECT"] = 4] = "SERVER_DISCONNECT";
    DisconnectReason[DisconnectReason["CUSTOM"] = 8] = "CUSTOM";
})(DisconnectReason || (DisconnectReason = {}));
export const MAGIC_BUILTIN_SKIN_BYTES = [0x00, 0x05, 0x01, 0x00, 0x00, 0x00];
export const MAGIC_ENDING_IDENTIFYS_BYTES = [0x00, 0x00, 0x00];
// Afterwards, forward 0x01 (Join Game, Clientbound) and everything after that
