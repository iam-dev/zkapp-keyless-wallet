import {
  Bool,
  DeployArgs,
  Field,
  Permissions,
  Reducer,
  SmartContract,
  State,
  state,
  Circuit,
  PrivateKey,
  PublicKey,
  method,
  Experimental,
  isReady,
} from 'snarkyjs';

import { Member } from './member.js';

await isReady;
export const adminPrivateKey = PrivateKey.random();
export const adminPublicKey = adminPrivateKey.toPublicKey();

interface GuardianParams {
  contractAddress: PublicKey;
  doProofs: boolean;
}

/**
 * Returns a new contract instance that based on a set of preconditions.
 * @param params {@link GuardianParams}
 */
export async function Guardian(params: GuardianParams): Promise<GuardianZkApp> {
  let contract = new GuardianZkApp(params.contractAddress);

  params.doProofs = true;
  if (params.doProofs) {
    await GuardianZkApp.compile();
  }

  return contract;
}
/**
 * The Guardian contract keeps track of a set of guardians.
 */
export class GuardianZkApp extends SmartContract {
  /**
   * Root of the merkle tree that stores all committed guardians.
   */
  @state(Field) committedGuardians = State<Field>();

  /**
   * Accumulator of all emitted guardians.
   */
  @state(Field) accumulatedGuardians = State<Field>();

  reducer = Reducer({ actionType: Member });

  init() {
    super.init();
    this.account.delegate.set(adminPublicKey);
  }

  deploy(args: DeployArgs) {
    super.deploy(args);
    this.account.permissions.set({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
      editSequenceState: Permissions.proofOrSignature(),
      setPermissions: Permissions.proofOrSignature(),
      setVerificationKey: Permissions.proofOrSignature(),
      incrementNonce: Permissions.proofOrSignature(),
    });
  }

  /**
   * Method used to register a new guardian.
   * Dispatches a new member sequence event.
   * @param member
   */
  @method guardianRegistration(member: Member, admin: PrivateKey): Bool {
    const adminPk = admin.toPublicKey();

    this.account.delegate.assertEquals(adminPk);

    // Emit event that indicates adding this item
    Experimental.createChildAccountUpdate(this.self, member.publicKey);

    let accumulatedGuardians = this.accumulatedGuardians.get();
    this.accumulatedGuardians.assertEquals(accumulatedGuardians);

    // checking if the member already exists within the accumulator
    let { state: exists } = this.reducer.reduce(
      this.reducer.getActions({
        fromActionHash: accumulatedGuardians,
      }),
      Bool,
      (state: Bool, action: Member) => {
        return action.equals(member).or(state);
      },
      // initial state
      { state: Bool(false), actionsHash: accumulatedGuardians }
    );

    /*
    we cant really branch the control flow - we will always have to emit an event no matter what, 
    so we emit an empty event if the member already exists
    it the member doesn't exist, emit the "real" member
    */

    let toEmit = Circuit.if(exists, Member.empty(), member);

    this.reducer.dispatch(toEmit);

    return exists;
  }

  /**
   * Method used to check whether a member exists within the committed storage.
   * @param accountId
   * @returns true if member exists
   */
  @method isMember(member: Member): Bool {
    // Verify guardian with the accountId via merkle tree committed to by the sequence events and returns a boolean
    // Preconditions: Item exists in committed storage

    let committedGuardians = this.committedGuardians.get();
    this.committedGuardians.assertEquals(committedGuardians);

    return member.witness
      .calculateRoot(member.getHash())
      .equals(committedGuardians);
  }

  /**
   * Method used to commit to the accumulated list guardians.
   */
  @method publish() {
    // Commit to the items accumulated so far. This is a periodic update

    let accumulatedGuardians = this.accumulatedGuardians.get();
    this.accumulatedGuardians.assertEquals(accumulatedGuardians);

    let committedGuardians = this.committedGuardians.get();
    this.committedGuardians.assertEquals(committedGuardians);

    let { state: newcommittedGuardians, actionsHash: newAccumulatedGuardians } =
      this.reducer.reduce(
        this.reducer.getActions({
          fromActionHash: accumulatedGuardians,
        }),
        Field,
        (state: Field, action: Member) => {
          // because we inserted empty members, we need to check if a member is empty or "real"
          let isRealMember = Circuit.if(
            action.publicKey.equals(PublicKey.empty()),
            Bool(false),
            Bool(true)
          );

          // if the member is real and not empty, we calculate and return the new merkle root
          // otherwise, we simply return the unmodified state - this is our way of branching
          return Circuit.if(
            isRealMember,
            action.witness.calculateRoot(action.getHash()),
            state
          );
        },
        // initial state
        { state: committedGuardians, actionsHash: accumulatedGuardians }
      );

    this.committedGuardians.set(newcommittedGuardians);
    this.accumulatedGuardians.set(newAccumulatedGuardians);
  }
}
