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
export type PlayerList = [
    EaglerPacketId.CUSTOM_PLAYER_LIST_ADD_PACKET, 
    UUID, 0xD6, 0x91, 0x9F, 0xD2, 
    /* username */ number, string, number, // 2nd number in string is 0x02, probably number of strings?
    number, string, // string in this is "textures"
    number, typeof PlayerListJson1, // base64 encoded string (see PlayerListJson1 for json contents)
    number, typeof PlayerListBase64Str, // base64 encoded string ()
    number, string, // string is isEaglerPlayer
    number, string, // boolean
    0x00, 0x01, 0x00, 0x00 // 256
]
export const PlayerListJson1 = {
    timestamp: null, // UNIX, in MS
    profileId: '65a4a3d370cb49bbad67f10086f1c543',
    profileName: 'lax1dude',
    signatureRequired: true,
    textures: {
        SKIN: {
            url: 'http://textures.minecraft.net/texture/d46393de83fbe165ab680a1821aad9f07d08b8196b2429fa046a15b61b129dc4'
        }
    }
}
export const PlayerListBase64Str = "¬X1eTQrruDPy+qp5pBNo+zIoPXGdhJKkhtPPgKIcBzgBDcp/CXhbcZong7886HSQyA2YMDL+muRgY+GLri+QH0wF5yZC5S1Nm8GrPPMScrWsgZRtyIv/cZnIQUtRAS4SQroup3M42s3blUjGjTfkjWTy5xxuHGaiXpgI1wAjsONfJebNLe+v3DvO2/7sbmMSQTEduODhF8J1QL44aiL5mAZFV+4XMzRVrs3wsIScwPaCSXqLRudn2tLRC5fylejnq5S9AHz17bDlwyWmMeG5djusM3ZVjYKfu3Bi/vEhG9eEyWhBxcDKilrXJ1ZwOeotwgwnafY4OLc18fS7w1LxHkedZLs/8gHZOpUQHcx2Kxhib5BOdRDMae+AuDRbR9Lk33txzYNlOS6drxHkpEyRwFTu7RYTQUIE+0Dljk4mZDqnTSd5ZDwb45FfYvm25nEu2r5hPj/UNUCAPTToNTCABWvWWuigVjt8pvATV05KPlzTl6bWqrLn822upkC3joP+H+GVR8TkdkGzyyjDbndt1hTXW+zIuB2og2oMuHAO5kI6JtEl26wk7eNYmBr4va6UpiEXAhYa10nRny+Fu9gHCHgMCW7n50+gK3IOAzxLt0QkrlYXgJI6uh5f125g/yMe7v5y49VpHwDcPkYBLcX0L9lxJh8EQem6ff8SLjcAwmdU="

// Afterwards, forward 0x01 (Join Game, Clientbound) and everything after that

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