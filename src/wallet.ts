import {
  Field,
  PublicKey,
  Permissions,
  Reducer,
  SmartContract,
  State,
  method,
  state,
  DeployArgs,
  Experimental,
  isReady,
  PrivateKey,
} from 'snarkyjs';

import { Member } from './member.js';
import RecoveryPreconditions from './recovery_preconditions.js';
import { GuardianZkApp } from './guardian.js';

/**
 * Address to the Membership instance that keeps track of Guardians.
 */
let guardianAddress = PublicKey.empty();

await isReady;

/**
 * Defines the preconditions of an election.
 */
let recoveryPreconditions = RecoveryPreconditions.default;

// as for now we use userPrivateKey to manage the wallet,
// this can be changed when SmartOTP's are implemented for the wallet
export const userPrivateKey = PrivateKey.random();
export const userPublicKey = userPrivateKey.toPublicKey();

interface WalletParams {
  recoveryPreconditions: RecoveryPreconditions;
  guardianAddress: PublicKey;
  contractAddress: PublicKey;
  doProofs: boolean;
}

/**
 * Returns a new contract instance that based on a set of preconditions.
 * @param params {@link WalletParams}
 */
export async function Wallet(params: WalletParams): Promise<WalletZkApp> {
  guardianAddress = params.guardianAddress;
  recoveryPreconditions = params.recoveryPreconditions;

  let contract = new WalletZkApp(params.contractAddress);
  params.doProofs = true;
  if (params.doProofs) {
    await WalletZkApp.compile();
  }
  return contract;
}

export class WalletZkApp extends SmartContract {
  /**
   * Root of the merkle tree that stores all committed guardians.
   */
  @state(Field) committedGuardians = State<Field>();

  /**
   * Accumulator of all emitted guardians.
   */
  @state(Field) accumulatedGuardians = State<Field>();

  /**
   * Root of the merkle tree that stores all committed votes.
   */
  @state(Field) committedVotes = State<Field>();

  /**
   * Accumulator of all emitted votes.
   */
  @state(Field) accumulatedVotes = State<Field>();

  reducer = Reducer({ actionType: Member });

  init() {
    super.init();
    this.account.delegate.set(userPublicKey);
  }

  deploy(args: DeployArgs) {
    super.deploy(args);
    this.account.permissions.set({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
      editSequenceState: Permissions.proofOrSignature(),
      incrementNonce: Permissions.proofOrSignature(),
      setVerificationKey: Permissions.none(),
      setPermissions: Permissions.proofOrSignature(),
    });
    this.accumulatedVotes.set(Reducer.initialActionsHash);
  }

  /**
   * Method used to add a new guardian to the user wallet.
   * @param accountId
   */
  @method
  addGuardian(guardianHash: Member, user: PrivateKey) {
    // access control
    const userPk = user.toPublicKey();
    this.account.delegate.assertEquals(userPk);

    let currentSlot = this.network.globalSlotSinceGenesis.get();
    this.network.globalSlotSinceGenesis.assertEquals(currentSlot);

    // can only register voters before the recovery process has started
    currentSlot.assertLte(recoveryPreconditions.startRecovery);

    Experimental.createChildAccountUpdate(this.self, guardianHash.publicKey);

    let GuardianContract: GuardianZkApp = new GuardianZkApp(guardianAddress);
    let isMember = GuardianContract.isMember(guardianHash);

    isMember.assertEquals(true);
  }
}
