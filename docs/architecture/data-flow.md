# Поток данных синхронизации

```mermaid
flowchart TB
    subgraph Import
        A[Marketplace API] -->|Каталог| B[Import Job]
        B --> C[Product/Variant + ProductOzon/ProductWb]
    end

    subgraph Master
        D[Product/Variant] <--> E[ProductOzon/ProductWb]
    end

    subgraph Publish
        E -->|Push| F[Marketplace API]
    end

    subgraph Origin
        G[lastStockOrigin] --> H{Origin check}
        H -->|Skip echo| B
    end
```

## Origin tracking

- При импорте: не перезаписывать master, если `lastStockOrigin` уже с этой площадки
- При push: hash-сравнение, skip echo (защита от ping-pong циклов)
