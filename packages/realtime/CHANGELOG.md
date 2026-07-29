# Changelog

## 0.1.0

- Initial draft of the Bird Realtime browser client: connect, subscribe (public / private- / presence- channels), bind events, client events, automatic reconnect with re-subscription — speaking the Bird wire dialect (connection_id, member_data auth, member_id/member_info presence members, bird:connection_count)
- Reconnect-lifecycle hardening: one socket per open, channels reset on drop, stale-auth subscribes dropped, idempotent subscribe that a server rejection cannot wedge, loud failure on a handshake without connection_id
