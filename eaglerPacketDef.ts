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
    CUSTOM = 0x8
}

// TODO: get skin fetching working
// Skins are raw Uint8 pixel data arrays.
// A pixel is represented by three bytes, each for each primary color: red, green and blue.
export type Skin = Buffer
// Prefixed skins are prefixed with their dimensions before being 
export type PrefixedSkin = Buffer
export const MAGIC_BUILTIN_SKIN_BYTES = [0x00, 0x05, 0x01, 0x00, 0x00, 0x00]
export const MAGIC_ENDING_IDENTIFY_S_BYTES = [0x00, 0x00, 0x00]
export const MAGIC_ENDING_S_SKINDL_BI = [0x00, 0x00, 0x00]
export const EAGLERCRAFT_SKIN_CHANNEL_NAME = "EAG|Skins-1.8"

// NOTE: unless explicitly marked, a number (VarInt) preceding a string is a string

export type IdentifyC = [EaglerPacketId.IDENTIFY_CLIENT, 0x01, 0x2f, number, string, number, string]
export type IdentifyS = [EaglerPacketId.IDENTIFY_SERVER, 0x01, number, string, number, string]
export type Login = [EaglerPacketId.LOGIN, number, string, number, "default", 0x0]
export type LoginAck = [EaglerPacketId.LOGIN_ACK, number, string, UUID]
export type BaseSkin = [EaglerPacketId.SKIN, number, string, ...typeof MAGIC_BUILTIN_SKIN_BYTES | [number]]
// IF base skin packet ends with magic bytes...
export type SkinBuiltIn = [EaglerPacketId.SKIN, number, string, ...typeof MAGIC_BUILTIN_SKIN_BYTES, number]
export type SkinCustom = [EaglerPacketId.SKIN, number, string, number, PrefixedSkin]
export type ClientReady = [EaglerPacketId.C_READY]
export type Joined = [EaglerPacketId.COMPLETE_HANDSHAKE]
export type Disconnect = [EaglerPacketId.DISCONNECT, number, string, DisconnectReason]

// EAGLERCRAFT SKIN PROTOCOL
// All Eaglercraft skin networking is done through plugin channels under the channel name EAG|Skins-1.8.
// Below are some packet defs.

export enum EaglerSkinPacketId {
    C_FETCH_SKIN = 0x03,
    S_SKIN_DL_BI = 0x04,
    S_SKIN_DL = 0x05,
    C_REQ_SKIN = 0x06
}

export type SkinId = number

// A Vanilla plugin channel message packet.
// Every message is encapsulated through one of these packets.
export type CBaseChannelMessage = [0x17, number, string, Buffer]
export type SBaseChannelMessage = [0x3f, number, string, Buffer]

export type CFetchSkin = [EaglerSkinPacketId.C_FETCH_SKIN, UUID]
export type SSkinDlBi = [EaglerSkinPacketId.S_SKIN_DL_BI, UUID, ...typeof MAGIC_ENDING_S_SKINDL_BI, SkinId]
export type SSkinDl = [EaglerSkinPacketId.S_SKIN_DL, UUID, number, Skin]
export type CSkinReq = [EaglerSkinPacketId.C_REQ_SKIN, UUID, 0x00, number, string]