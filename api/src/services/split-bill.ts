type Member = {
  id: string;
  memberOrder: number;
};

type Share = {
  memberId: string;
  amountCents: number;
};

export function splitBill(
  totalCents: number,
  members: Member[],
): Share[] {
  if (!Number.isSafeInteger(totalCents) || totalCents < 0) {
    throw new Error("Invalid bill amount");
  }

  if (members.length === 0) {
    throw new Error("Cannot split bill without members");
  }

  const sortedMembers = [...members].sort(
    (a, b) => a.memberOrder - b.memberOrder,
  );

  const baseShare = Math.floor(totalCents / sortedMembers.length);
  const remainder = totalCents % sortedMembers.length;

  return sortedMembers.map((member, index) => ({
    memberId: member.id,
    amountCents: baseShare + (index < remainder ? 1 : 0),
  }));
}