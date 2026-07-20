import { ForbiddenError } from "../../domain/errors/domain-error";
import { MembershipRepository } from "../../domain/network/membership-repository";
import { Network } from "../../domain/network/network";

async function isApprovedMember(
  memberships: MembershipRepository,
  networkId: string,
  userId: string,
): Promise<boolean> {
  const membership = await memberships.find(networkId, userId);
  return membership?.status === "approved";
}

export async function assertCanRead(
  network: Network,
  userId: string,
  memberships: MembershipRepository,
): Promise<void> {
  if (network.accessMode === "public" || network.ownerId === userId) {
    return;
  }
  if (!(await isApprovedMember(memberships, network.id, userId))) {
    throw new ForbiddenError("access not granted");
  }
}

export async function assertCanContribute(
  network: Network,
  userId: string,
  memberships: MembershipRepository,
): Promise<void> {
  if (network.ownerId === userId) {
    return;
  }
  // Rede pública é aberta: assim como qualquer autenticado pode ler/baixar
  // (assertCanRead), qualquer autenticado pode contribuir. Sem isso, um não-owner
  // nunca conseguiria publicar numa rede pública (ninguém vira membro aprovado lá).
  if (network.accessMode === "public") {
    return;
  }
  if (network.updateMode === "centralized") {
    throw new ForbiddenError("only the owner can publish in centralized mode");
  }
  if (!(await isApprovedMember(memberships, network.id, userId))) {
    throw new ForbiddenError("only approved members can publish");
  }
}
