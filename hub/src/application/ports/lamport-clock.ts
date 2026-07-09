export interface LamportClock {
  next(networkId: string): Promise<number>;
}
