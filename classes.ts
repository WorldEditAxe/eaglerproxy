import { Client } from "minecraft-protocol"
import { WebSocket } from "ws"
import { State } from "./types.js"

export class ProxiedPlayer {
    public username: string
    public uuid: string
    public clientBrand: string
    public state: State
    public ws: WebSocket
    public ip: string
    public remotePort: number
    public remoteConnection: Client
    public compressionThreshold: number
}