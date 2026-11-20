import { FilterQuery, Types } from "mongoose";
import { ADMIN_ROLES, BookingStatus, ImageFolder, MemberRole, MemberStatus, PaymentStatus } from "../constants/enums";
import { Member } from "../interfaces/member.interface";
import { BookingModel, MemberModel, PaymentModel } from "../models";
import { AppError } from "../utils/AppError";
import { buildPaginationMeta, getSkip, PaginatedResult, PaginationInput } from "../utils/pagination";
import { containsRegex } from "../utils/strings";
import { CreateAdminInput, UpdateAdminInput, UpdateProfileInput } from "../validators/auth.validator";
import { authService } from "./Auth.service";
import { ImageFile, uploadService } from "./Upload.service";

export interface MemberListQuery extends PaginationInput {
  search?: string;
  status?: MemberStatus;
  sort: "newest" | "oldest" | "name";
}

export interface CustomerStats {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalSpent: number;
  lastBookingAt?: Date;
}

const SORTS: Record<MemberListQuery["sort"], Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  name: { firstName: 1, lastName: 1 },
};

class MemberService {
  private readonly memberModel = MemberModel;

  public async getById(memberId: Types.ObjectId | string): Promise<Member> {
    const member = await this.memberModel.findById(memberId).lean<Member>().exec();
    if (!member || member.status === MemberStatus.DELETED) throw AppError.notFound("Member not found");
    return member;
  }

  public async updateProfile(memberId: Types.ObjectId, input: UpdateProfileInput): Promise<Member> {
    const current = await this.getById(memberId);
    if (input.phone) await authService.assertUniqueContact(current.email, input.phone, memberId);

    const { phone, ...rest } = input;
    const update = phone === null ? { $set: rest, $unset: { phone: 1 } } : { $set: { ...rest, ...(phone ? { phone } : {}) } };

    const member = await this.memberModel.findByIdAndUpdate(memberId, update, { new: true, runValidators: true }).lean<Member>().exec();
    if (!member) throw AppError.notFound("Member not found");
    return member;
  }

  public async updateAvatar(memberId: Types.ObjectId, file: ImageFile): Promise<Member> {
    const current = await this.getById(memberId);
    const avatar = await uploadService.uploadImage(file, ImageFolder.AVATARS);
    const member = await this.memberModel.findByIdAndUpdate(memberId, { $set: { avatar } }, { new: true }).lean<Member>().exec();
    if (current.avatar) await uploadService.deleteImages([current.avatar]);
    if (!member) throw AppError.notFound("Member not found");
    return member;
  }

  /* ---------------- Admin: customer management ---------------- */

  public async listMembers(roles: readonly MemberRole[], query: MemberListQuery): Promise<PaginatedResult<Member>> {
    const filter: FilterQuery<Member> = { role: { $in: roles }, status: query.status ?? { $ne: MemberStatus.DELETED } };
    if (query.search) {
      const regex = containsRegex(query.search);
      filter.$or = [{ firstName: regex }, { lastName: regex }, { email: regex }, { phone: regex }];
    }

    const [items, total] = await Promise.all([
      this.memberModel.find(filter).sort(SORTS[query.sort]).skip(getSkip(query)).limit(query.limit).lean<Member[]>().exec(),
      this.memberModel.countDocuments(filter).exec(),
    ]);
    return { items, meta: buildPaginationMeta(query, total) };
  }

  public async getCustomerDetail(customerId: string): Promise<{ customer: Member; stats: CustomerStats }> {
    const customer = await this.memberModel.findOne({ _id: customerId, role: MemberRole.CUSTOMER }).lean<Member>().exec();
    if (!customer) throw AppError.notFound("Customer not found");
    return { customer, stats: await this.getCustomerStats(customer._id) };
  }

  public async updateCustomerStatus(customerId: string, status: MemberStatus): Promise<Member> {
    const customer = await this.memberModel
      .findOneAndUpdate({ _id: customerId, role: MemberRole.CUSTOMER }, { $set: { status } }, { new: true })
      .lean<Member>()
      .exec();
    if (!customer) throw AppError.notFound("Customer not found");
    if (status !== MemberStatus.ACTIVE) await authService.revokeAllSessions(customer._id);
    return customer;
  }

  /* ---------------- Super admin: administrator management ---------------- */

  public async createAdmin(input: CreateAdminInput, createdBy?: Types.ObjectId): Promise<Member> {
    await authService.assertUniqueContact(input.email, input.phone);
    const admin = await this.memberModel.create({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      role: input.role,
      passwordHash: await authService.hashPassword(input.password),
      createdBy,
    });
    return admin.toJSON() as Member;
  }

  public async updateAdmin(adminId: string, input: UpdateAdminInput, actorId: Types.ObjectId): Promise<Member> {
    // Prevents a super admin from locking themselves (and possibly everyone) out.
    if (actorId.toString() === adminId) throw AppError.badRequest("You cannot change your own role or status");

    const admin = await this.memberModel
      .findOneAndUpdate({ _id: adminId, role: { $in: ADMIN_ROLES } }, { $set: input }, { new: true })
      .lean<Member>()
      .exec();
    if (!admin) throw AppError.notFound("Administrator not found");
    if (input.status && input.status !== MemberStatus.ACTIVE) await authService.revokeAllSessions(admin._id);
    return admin;
  }

  private async getCustomerStats(customerId: Types.ObjectId): Promise<CustomerStats> {
    const [bookingStats, spent] = await Promise.all([
      BookingModel.aggregate<{ _id: BookingStatus; count: number; lastBookingAt: Date }>([
        { $match: { customer: customerId } },
        { $group: { _id: "$status", count: { $sum: 1 }, lastBookingAt: { $max: "$createdAt" } } },
      ]).exec(),
      PaymentModel.aggregate<{ total: number }>([
        { $match: { customer: customerId, status: { $in: [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED] } } },
        { $group: { _id: null, total: { $sum: { $subtract: ["$amount", "$refundedAmount"] } } } },
      ]).exec(),
    ]);

    const countOf = (status: BookingStatus) => bookingStats.find((row) => row._id === status)?.count ?? 0;
    const lastDates = bookingStats.map((row) => row.lastBookingAt.getTime());
    return {
      totalBookings: bookingStats.reduce((sum, row) => sum + row.count, 0),
      completedBookings: countOf(BookingStatus.COMPLETED),
      cancelledBookings: countOf(BookingStatus.CANCELLED),
      totalSpent: spent[0]?.total ?? 0,
      lastBookingAt: lastDates.length ? new Date(Math.max(...lastDates)) : undefined,
    };
  }
}

export const memberService = new MemberService();
