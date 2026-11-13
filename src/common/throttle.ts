import { Throttle } from '@nestjs/throttler'

const minutes = (n: number) => n * 60_000

export const DEFAULT_THROTTLE = { ttl: minutes(1), limit: 100 }

export const ThrottleLogin = () => Throttle({ default: { ttl: minutes(1), limit: 5 } })

export const ThrottlePublicWrite = () => Throttle({ default: { ttl: minutes(10), limit: 5 } })
