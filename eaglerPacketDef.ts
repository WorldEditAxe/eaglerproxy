import { UUID } from "./types.js"

export enum EaglerPacketId {
    IDENTIFY_CLIENT = 0x01,
    IDENTIFY_SERVER = 0x2,
    LOGIN = 0x4,
    LOGIN_ACK = 0x05,
    SKIN = 0x07,
    C_READY = 0x08,
    COMPLETE_HANDSHAKE = 0x09,
    DISCONNECT = 0xff
}

export enum DisconnectReason {
    UNEXPECTED_PACKET = 0x1,
    DUPLICATE_USERNAME = 0x2,
    BAD_USERNAME = 0x3,
    SERVER_DISCONNECT = 0x4,
    CUSTOM = 0x8
}

// TODO: get skins + server icon working
export type Bitmap = unknown
export const MAGIC_BUILTIN_SKIN_BYTES = [0x00, 0x05, 0x01, 0x00, 0x00, 0x00]
export const MAGIC_ENDING_IDENTIFYS_BYTES = [0x00, 0x00, 0x00]

// NOTE: unless explicitly marked, a number (VarInt) preceding a string is a string

export type IdentifyC = [EaglerPacketId.IDENTIFY_CLIENT, 0x01, 0x2f, number, string, number, string]
export type IdentifyS = [EaglerPacketId.IDENTIFY_SERVER, 0x01, number, string, number, string]
export type Login = [EaglerPacketId.LOGIN, number, string, number, "default", 0x0]
export type LoginAck = [EaglerPacketId.LOGIN_ACK, number, string, UUID]
export type BaseSkin = [EaglerPacketId.SKIN, number, string, ...typeof MAGIC_BUILTIN_SKIN_BYTES | [number]]
// IF base skin packet ends with magic bytes...
export type SkinBuiltIn = [EaglerPacketId.SKIN, number, string, ...typeof MAGIC_BUILTIN_SKIN_BYTES, number]
export type SkinCustom = [EaglerPacketId.SKIN, number, string, number, Bitmap]
export type ClientReady = [EaglerPacketId.C_READY]
export type Joined = [EaglerPacketId.COMPLETE_HANDSHAKE]
export type Disconnect = [EaglerPacketId.DISCONNECT, number, string, DisconnectReason]

// Afterwards, forward 0x01 (Join Game, Clientbound) and everything after that