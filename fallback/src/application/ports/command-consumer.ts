export interface RawMessage {
  body: string;
  receiptHandle: string;
}

export interface CommandConsumer {
  receive(): Promise<RawMessage[]>;
  ack(receiptHandle: string): Promise<void>;
}
