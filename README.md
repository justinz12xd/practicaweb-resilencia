# Sistema de Adopción de Animales - Arquitectura de Microservicios

## Diagrama C4 - Nivel 1: Contexto del Sistema

```mermaid
C4Context
    title Sistema de Adopción de Animales - Contexto del Sistema

    Person(user, "Usuario", "Cliente que realiza solicitudes de adopción")
    
    System_Boundary(sistema, "Sistema de Adopción") {
        Container(gateway, "API Gateway", "NestJS:3000", "Punto de entrada HTTP para solicitudes externas")
        Container(msAdoption, "MS Adoption", "NestJS:3002", "Gestiona adopciones con idempotencia")
        Container(msAnimal, "MS Animal", "NestJS:3001", "Gestiona estado de animales")
    }
    
    System_Ext(rabbitmq, "RabbitMQ", "Message Broker para comunicación asíncrona")
    System_Ext(redis, "Redis", "Cache distribuido")
    System_Ext(pgAdoption, "PostgreSQL Adoption", ":5433", "Base de datos de adopciones")
    System_Ext(pgAnimal, "PostgreSQL Animal", ":5434", "Base de datos de animales")

    Rel(user, gateway, "Solicita adopción", "HTTP POST")
    Rel(gateway, rabbitmq, "Publica evento", "adoption.request")
    Rel(rabbitmq, msAdoption, "Consume evento", "adoption_queue")
    Rel(msAdoption, pgAdoption, "Lee/Escribe", "TypeORM")
    Rel(msAdoption, rabbitmq, "Publica evento", "adoption.created")
    Rel(rabbitmq, msAnimal, "Consume evento", "animal_queue")
    Rel(msAnimal, pgAnimal, "Actualiza estado", "TypeORM")
    Rel(msAdoption, redis, "Almacena idempotencia", "Cache")

    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

## Diagrama de Flujo Detallado

```mermaid
sequenceDiagram
    participant U as Usuario
    participant GW as API Gateway<br/>(Puerto 3000)
    participant RMQ as RabbitMQ
    participant MSA as MS Adoption<br/>(Puerto 3002)
    participant Redis as Redis Cache
    participant DBA as PostgreSQL<br/>Adoption DB
    participant MSAn as MS Animal<br/>(Puerto 3001)
    participant DBN as PostgreSQL<br/>Animal DB

    U->>GW: POST /adoptions<br/>{animal_id, adopter_name}
    activate GW
    GW->>GW: Genera UUID mensaje
    GW->>RMQ: Publica evento<br/>adoption.request
    GW-->>U: {status: PUBLISHED, message_id}
    deactivate GW

    RMQ->>MSA: Consume adoption_queue
    activate MSA
    MSA->>Redis: Verifica idempotencia<br/>(message_id)
    alt Primera vez
        Redis-->>MSA: No existe
        MSA->>DBA: INSERT adoption
        MSA->>Redis: Guarda message_id
        MSA->>RMQ: Publica adoption.created
        MSA->>RMQ: ACK mensaje
    else Ya procesado
        Redis-->>MSA: Ya existe
        MSA->>RMQ: ACK mensaje (skip)
    end
    deactivate MSA

    RMQ->>MSAn: Consume animal_queue
    activate MSAn
    MSAn->>DBN: UPDATE animal<br/>SET adopted = true
    MSAn->>RMQ: ACK mensaje
    deactivate MSAn
```

## Arquitectura de Componentes

```mermaid
graph TB
    subgraph "Cliente"
        Client[Cliente HTTP]
    end

    subgraph "API Layer"
        GW[MS Gateway<br/>Port 3000<br/>HTTP Server]
    end

    subgraph "Message Broker"
        RMQ[RabbitMQ<br/>Port 5672]
        Q1[adoption_queue]
        Q2[animal_queue]
        RMQ --> Q1
        RMQ --> Q2
    end

    subgraph "Business Logic Layer"
        MSA[MS Adoption<br/>Port 3002<br/>HTTP + RMQ Consumer]
        MSAn[MS Animal<br/>Port 3001<br/>HTTP + RMQ Consumer]
        
        subgraph "MS Adoption Components"
            IG[Idempotency Guard]
            AS[Adoption Service]
        end
        
        MSA --> IG
        MSA --> AS
    end

    subgraph "Data Layer"
        Redis[(Redis Cache<br/>Port 6379)]
        PGA[(PostgreSQL<br/>adoption_db<br/>Port 5433)]
        PGN[(PostgreSQL<br/>animal_db<br/>Port 5434)]
    end

    Client -->|POST /adoptions| GW
    GW -->|emit adoption.request| RMQ
    Q1 -->|consume| MSA
    MSA -->|check/store| Redis
    MSA -->|CRUD| PGA
    MSA -->|emit adoption.created| RMQ
    Q2 -->|consume| MSAn
    MSAn -->|UPDATE| PGN

    style GW fill:#e1f5ff
    style MSA fill:#fff4e1
    style MSAn fill:#e8f5e9
    style RMQ fill:#f3e5f5
    style Redis fill:#ffebee
    style PGA fill:#e0f2f1
    style PGN fill:#e0f2f1
```

## Patrones de Resiliencia Implementados

```mermaid
mindmap
  root((Resiliencia))
    Idempotencia
      Message ID único
      Redis Cache
      Validación duplicados
    Mensajería Asíncrona
      RabbitMQ
      Colas durables
      ACK manual
    Separación de Datos
      DB por microservicio
      PostgreSQL isolation
    Event Driven
      Desacoplamiento
      Eventos de dominio
```

## Descripción de Componentes

### 1. **API Gateway** (Puerto 3000)
- **Responsabilidad**: Punto de entrada HTTP para clientes externos
- **Tecnología**: NestJS con ClientProxy de RabbitMQ
- **Función**: Recibe solicitudes de adopción y las publica como eventos en RabbitMQ

### 2. **MS Adoption** (Puerto 3002)
- **Responsabilidad**: Gestión de adopciones con garantía de idempotencia
- **Tecnología**: NestJS + TypeORM + Redis
- **Componentes**:
  - **Idempotency Guard**: Previene procesamiento duplicado usando Redis
  - **Adoption Service**: Lógica de negocio para crear adopciones
- **Base de Datos**: PostgreSQL (adoption_db) en puerto 5433
- **Eventos**: 
  - Consume: `adoption.request` desde `adoption_queue`
  - Publica: `adoption.created` hacia `animal_queue`

### 3. **MS Animal** (Puerto 3001)
- **Responsabilidad**: Gestión del estado de animales
- **Tecnología**: NestJS + TypeORM
- **Función**: Marca animales como adoptados cuando recibe eventos
- **Base de Datos**: PostgreSQL (animal_db) en puerto 5434
- **Eventos**: 
  - Consume: `adoption.created` desde `animal_queue`

### 4. **RabbitMQ** (Puertos 5672, 15672)
- **Responsabilidad**: Message broker para comunicación asíncrona
- **Colas**:
  - `adoption_queue`: Para eventos de solicitud de adopción
  - `animal_queue`: Para notificaciones de adopción creada

### 5. **Redis** (Puerto 6379)
- **Responsabilidad**: Cache distribuido para control de idempotencia
- **Uso**: Almacena message_id procesados para evitar duplicados

### 6. **PostgreSQL**
- **adoption_db** (Puerto 5433): Almacena registros de adopciones e idempotencia
- **animal_db** (Puerto 5434): Almacena información de animales

## Flujo de Adopción

1. **Usuario** envía `POST /adoptions` con `{animal_id, adopter_name}` al **Gateway**
2. **Gateway** genera un UUID único y publica evento `adoption.request` en RabbitMQ
3. **MS Adoption** consume el evento desde `adoption_queue`
4. **Idempotency Guard** verifica en Redis si el mensaje ya fue procesado
5. Si es nuevo:
   - Crea el registro de adopción en PostgreSQL
   - Guarda el message_id en Redis
   - Publica evento `adoption.created`
6. **MS Animal** consume el evento desde `animal_queue`
7. **MS Animal** actualiza el estado del animal a "adoptado" en su base de datos

## Características Clave

- ✅ **Idempotencia**: Previene procesamiento duplicado mediante Redis
- ✅ **Comunicación Asíncrona**: Desacoplamiento mediante RabbitMQ
- ✅ **Separación de Responsabilidades**: Cada microservicio con su propia base de datos
- ✅ **Confirmación de Mensajes**: ACK manual para garantizar procesamiento
- ✅ **Event-Driven Architecture**: Comunicación basada en eventos de dominio

## Tecnologías Utilizadas

- **Framework**: NestJS
- **Lenguaje**: TypeScript
- **Message Broker**: RabbitMQ 3.11
- **Base de Datos**: PostgreSQL 17
- **Cache**: Redis 7
- **ORM**: TypeORM
- **Containerización**: Docker Compose

## Ejecución

```bash
# Levantar infraestructura
docker-compose up -d

# Instalar dependencias
cd ms-gateway && npm install
cd ms-adoption && npm install
cd ms-animal && npm install

# Ejecutar microservicios
cd ms-gateway && npm run start:dev
cd ms-adoption && npm run start:dev
cd ms-animal && npm run start:dev
```

## Endpoints

- **Gateway**: http://localhost:3000
  - `POST /adoptions` - Solicitar adopción
- **MS Adoption**: http://localhost:3002
- **MS Animal**: http://localhost:3001
- **RabbitMQ Management**: http://localhost:15672 (guest/guest)
