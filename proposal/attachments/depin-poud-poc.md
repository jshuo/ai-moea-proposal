``` mermaid
sequenceDiagram
  participant T as Smart TOTE (PUF)
  participant H as Smart HUB
  participant C as Cloud (Registry)

  H->>C: Get TOTE public key (tote_id)
  C-->>H: tote_public_key

  H->>T: hub_nonce, time_bucket, hub_eph_pub(optional)
  Note over T: Use PUF to unlock device private key
  T->>H: tote_id, tote_nonce, tote_eph_pub(optional), signature(challenge)

  Note over H: Verify signature with tote_public_key
  Note over T,H: Derive K_session (HKDF over ECDH + nonces)

  loop Telemetry / Events
    T->>H: payload + seq + mac(K_session)
  end

  H->>C: Forward summaries/proofs + operator scoring inputs

```