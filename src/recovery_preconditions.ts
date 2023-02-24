import { Struct, UInt32 } from 'snarkyjs';

export default class RecoveryPreconditions extends Struct({
  startRecovery: UInt32,
  endRecovery: UInt32,
}) {
  constructor(startRecovery: UInt32, endRecovery: UInt32) {
    super({
      startRecovery: new UInt32(0),
      endRecovery: UInt32.MAXINT(),
    });
    this.startRecovery = startRecovery;
    this.endRecovery = endRecovery;
  }
}
