import {
  Bool,
  Field,
  MerkleWitness,
  Poseidon,
  PublicKey,
  Struct,
} from 'snarkyjs';

export class MyMerkleWitness extends MerkleWitness(8) {}
let w = {
  isLeft: false,
  sibling: Field(0),
};
let memberWitness = Array.from(Array(MyMerkleWitness.height - 1).keys()).map(
  () => w
);

export class Member extends Struct({
  accountId: Field,
  publicKey: PublicKey,
  votes: Field,
  hashVoted: Bool,
  witness: MerkleWitness,
  votesWitness: MerkleWitness,
}) {
  private static count = 0;

  constructor(accountId: Field, publicKey: PublicKey) {
    super({
      accountId: Field(0),
      publicKey: PublicKey.empty(),
      votes: Field(0),
      hashVoted: Bool(false),
      witness: MerkleWitness(8),
      votesWitness: MerkleWitness(8),
    });
    this.accountId = accountId;
    this.publicKey = publicKey;
    this.hashVoted = Bool(false);
    this.votes = Field(0);

    this.witness = new MyMerkleWitness(memberWitness);
    this.votesWitness = new MyMerkleWitness(memberWitness);
  }

  getHash(): Field {
    return Poseidon.hash(
      this.publicKey
        .toFields()
        .concat(this.accountId.toFields())
        .concat(this.votes.toFields())
        .concat(this.hashVoted.toFields())
    );
  }

  getHashVotes(): Bool {
    return this.hashVoted;
  }

  addVote(): Member {
    this.hashVoted.assertEquals(Bool(false));
    this.votes = this.votes.add(1);
    this.hashVoted = Bool(true);
    return this;
  }

  static empty() {
    return new Member(Field(0), PublicKey.empty());
  }

  static from(publicKey: PublicKey) {
    this.count++;
    return new Member(Field(this.count), publicKey);
  }
}
