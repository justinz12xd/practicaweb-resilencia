# MCP Server - Animal Adoption System

Model Context Protocol (MCP) Server implementing JSON-RPC 2.0 for the Animal Adoption microservices system.

## 🎯 Purpose

This MCP Server exposes three core Tools that allow AI agents (via Gemini) to orchestrate animal adoption workflows using natural language:

1. **buscar_animal** - Search for animals by name/availability
2. **validar_disponibilidad** - Validate if an animal is available for adoption
3. **crear_adopcion** - Create a new adoption record

## 🏗️ Architecture

```
┌─────────────┐
│   Gemini    │
│     AI      │
└──────┬──────┘
       │
       ↓
┌─────────────┐      JSON-RPC 2.0      ┌─────────────┐
│ API Gateway │ ←──────────────────────→ │ MCP Server  │
│   :3000     │                          │   :3003     │
└─────────────┘                          └──────┬──────┘
                                                │
                                                ├→ PostgreSQL (animal_db:5434)
                                                ├→ PostgreSQL (adoption_db:5433)
                                                └→ HTTP Gateway API
```

## 📦 Installation

```bash
cd apps/mcp-server
npm install
cp .env.example .env
# Edit .env with your configuration
```

## 🚀 Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

## 🔧 JSON-RPC 2.0 Endpoints

### List Available Tools
```http
POST http://localhost:3003/
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "id": 1
}
```

### Call a Tool
```http
POST http://localhost:3003/
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "buscar_animal",
    "arguments": {
      "nombre": "Max"
    }
  },
  "id": 2
}
```

## 🛠️ Available Tools

### 1. buscar_animal

**Description**: Busca animales en el sistema por nombre o disponibilidad.

**Parameters**:
```json
{
  "nombre": "string (optional)",
  "disponible": "boolean (optional)"
}
```

**Example**:
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "buscar_animal",
    "arguments": {
      "nombre": "Max",
      "disponible": true
    }
  },
  "id": 1
}
```

**Response**:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Encontrados 1 animales: [...]"
      }
    ]
  },
  "id": 1
}
```

### 2. validar_disponibilidad

**Description**: Valida si un animal está disponible para adopción.

**Parameters**:
```json
{
  "animal_id": "string (required)"
}
```

**Example**:
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "validar_disponibilidad",
    "arguments": {
      "animal_id": "123e4567-e89b-12d3-a456-426614174000"
    }
  },
  "id": 2
}
```

**Response**:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Animal disponible: Max (Perro)"
      }
    ]
  },
  "id": 2
}
```

### 3. crear_adopcion

**Description**: Crea un registro de adopción para un animal.

**Parameters**:
```json
{
  "animal_id": "string (required)",
  "adopter_name": "string (required)",
  "adopter_email": "string (required)"
}
```

**Example**:
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "crear_adopcion",
    "arguments": {
      "animal_id": "123e4567-e89b-12d3-a456-426614174000",
      "adopter_name": "Juan Pérez",
      "adopter_email": "juan@example.com"
    }
  },
  "id": 3
}
```

**Response**:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Adopción creada exitosamente con ID: abc-123"
      }
    ]
  },
  "id": 3
}
```

## 🧪 Testing

Use Thunder Client, Postman, or curl:

```bash
# List tools
curl -X POST http://localhost:3003/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# Search animals
curl -X POST http://localhost:3003/ \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "buscar_animal",
      "arguments": {"disponible": true}
    },
    "id": 2
  }'
```

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | MCP Server port | 3003 |
| `ANIMAL_DB_HOST` | Animal database host | localhost |
| `ANIMAL_DB_PORT` | Animal database port | 5434 |
| `ADOPTION_DB_HOST` | Adoption database host | localhost |
| `ADOPTION_DB_PORT` | Adoption database port | 5433 |
| `GATEWAY_URL` | API Gateway URL | http://localhost:3000 |

## 🔒 Security Notes

- This server is designed for internal microservice communication
- Add authentication/authorization for production use
- Use environment variables for sensitive data
- Validate all input parameters before processing

## 📚 References

- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
