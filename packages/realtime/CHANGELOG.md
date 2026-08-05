# Changelog

## 0.3.0

- Deliver events addressed to a member. Once `signin()` succeeds the client subscribes to the member's reserved channel and surfaces those events on `bird.member`, so an event sent with `realtime.members.send` reaches every connection that member holds. The subscription follows the identity: it is established on each signin, including the automatic one after a reconnect, and dropped with the connection. Protocol frames never reach the emitter, and a different member's events never do either.

## 0.2.1

- Point the package repository and issue URLs at the renamed bird-sdk-typescript mirror.

## 0.2.0

- Add `signin()`, which identifies a connection's member so the events API can address it and the disconnect API can terminate it. The default authorizer POSTs `connection_id` to `memberAuthEndpoint` (`/bird/auth/member`), the identity is re-established on every reconnect, a connection terminated through the API surfaces close code 4009 on `connection.bind("error", ...)`, and a re-signin that fails after a reconnect (which has no promise to reject) is reported on `connection.bind("signin_error", ...)`.

## 0.1.0

- Initial draft of the Bird Realtime browser client: connect, subscribe (public / private- / presence- channels), bind events, client events, automatic reconnect with re-subscription — speaking the Bird wire dialect (connection_id, member_data auth, member_id/member_info presence members, bird:connection_count)
- Reconnect-lifecycle hardening: one socket per open, channels reset on drop, stale-auth subscribes dropped, idempotent subscribe that a server rejection cannot wedge, loud failure on a handshake without connection_id
