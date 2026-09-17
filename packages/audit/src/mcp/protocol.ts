/**
 * @module mcp/protocol
 *
 * MCP over stdio, implemented directly. The transport is newline-delimited
 * JSON-RPC 2.0 — one message per line, no Content-Length framing (that's LSP,
 * and confusing the two is the usual reason a hand-rolled server never
 * completes its handshake).
 *
 * Written out rather than pulled from the SDK so the server keeps the same
 * property as the engine: zero runtime dependencies. The protocol surface a
 * tools-only server needs is four methods.
 *
 * THE ONE INVARIANT
 * stdout carries protocol frames and nothing else. A stray `console.log`
 * anywhere in the process corrupts the stream and the client drops the
 * connection with no useful error. Everything diagnostic goes to stderr.
 */
import { createInterface } from 'node:readline'

export interface JsonRpcRequest {
  jsonrpc: '2.0'
  id?: string | number
  method: string
  params?: Record<string, unknown>
}

export interface ToolDefinition {
  name: string
  title?: string
  description: string
  inputSchema: Record<string, unknown>
}

export interface ToolResult {
  content: Array<{ type: 'text'; text: string }>
  isError?: boolean
}

export interface ServerInfo {
  name: string
  version: string
}

/** Versions this server knows how to speak, newest first. */
const SUPPORTED = ['2025-06-18', '2025-03-26', '2024-11-05']

const enum ErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
}

export interface ServerOptions {
  info: ServerInfo
  tools: ToolDefinition[]
  call: (name: string, args: Record<string, unknown>) => Promise<ToolResult>
}

export function serve(options: ServerOptions): void {
  const write = (message: unknown) => {
    process.stdout.write(`${JSON.stringify(message)}\n`)
  }

  const respond = (id: string | number, result: unknown) => write({ jsonrpc: '2.0', id, result })

  const fail = (id: string | number, code: ErrorCode, message: string) =>
    write({ jsonrpc: '2.0', id, error: { code, message } })

  const handle = async (request: JsonRpcRequest) => {
    const { id, method, params = {} } = request

    // Notifications carry no id and must never be answered — replying to one
    // is a protocol violation that some clients treat as fatal.
    const isNotification = id === undefined || id === null

    switch (method) {
      case 'initialize': {
        if (isNotification) return
        const requested = typeof params.protocolVersion === 'string' ? params.protocolVersion : ''
        respond(id, {
          // Echo the client's version when we know it; otherwise offer ours and
          // let the client decide whether it can proceed.
          protocolVersion: SUPPORTED.includes(requested) ? requested : SUPPORTED[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: options.info,
        })
        return
      }

      case 'notifications/initialized':
      case 'notifications/cancelled':
        return

      case 'ping':
        if (!isNotification) respond(id, {})
        return

      case 'tools/list':
        if (isNotification) return
        respond(id, { tools: options.tools })
        return

      case 'tools/call': {
        if (isNotification) return
        const name = typeof params.name === 'string' ? params.name : ''
        const args = (params.arguments ?? {}) as Record<string, unknown>

        if (!options.tools.some((tool) => tool.name === name)) {
          fail(id, ErrorCode.InvalidParams, `Unknown tool: ${name}`)
          return
        }

        try {
          respond(id, await options.call(name, args))
        } catch (error) {
          // A failing tool is a tool result, not a transport error — the model
          // needs to see the message so it can correct the call.
          respond(id, {
            content: [{ type: 'text', text: `Error: ${(error as Error).message}` }],
            isError: true,
          })
        }
        return
      }

      default:
        if (!isNotification) fail(id, ErrorCode.MethodNotFound, `Unknown method: ${method}`)
    }
  }

  const input = createInterface({ input: process.stdin })

  // Requests are handled in arrival order. Serialising them keeps the browser
  // driver from being launched several times over by a client that pipelines.
  let chain: Promise<void> = Promise.resolve()

  input.on('line', (line) => {
    const text = line.trim()
    if (!text) return

    let request: JsonRpcRequest
    try {
      request = JSON.parse(text)
    } catch {
      write({ jsonrpc: '2.0', id: null, error: { code: ErrorCode.ParseError, message: 'Invalid JSON' } })
      return
    }

    chain = chain.then(() =>
      handle(request).catch((error: Error) => {
        process.stderr.write(`[luku-audit-mcp] ${error.stack ?? error.message}\n`)
      }),
    )
  })

  // Drain before exiting. A client that closes stdin immediately after writing
  // a request — or any pipeline shorter than the browser launch — would
  // otherwise kill the process mid-audit and get no response at all.
  input.on('close', () => {
    chain.then(() => process.exit(0)).catch(() => process.exit(1))
  })
}
