import { BadRequestException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { PinAuthService } from "./pin-auth.service";
import { SessionService } from "./session.service";

describe("AuthController.verifyAction", () => {
  const authService = {} as AuthService;
  const sessionService = {} as SessionService;
  const jwtService = {} as JwtService;

  let pinAuthService: {
    verifyPinAndLogAction: jest.Mock;
  };
  let controller: AuthController;

  beforeEach(() => {
    pinAuthService = {
      verifyPinAndLogAction: jest.fn(),
    };

    controller = new AuthController(
      authService,
      pinAuthService as unknown as PinAuthService,
      sessionService,
      jwtService,
    );
  });

  it("uses staffId from request body when provided", async () => {
    const dto = {
      staffId: "staff-body",
      pin: "1234",
      action: "payment.refund",
      resourceId: "order-1",
    };
    const user = { merchantId: "merchant-1" };
    const req = { ip: "10.0.0.1", headers: {} };
    const expectedResult = {
      success: true,
      staff: {
        id: "staff-body",
        firstName: "Test",
        lastName: "User",
        accessLevel: 1,
        role: "STAFF",
      },
    };
    pinAuthService.verifyPinAndLogAction.mockResolvedValue(expectedResult);

    const result = await controller.verifyAction(dto as any, user, req);

    expect(result).toEqual(expectedResult);
    expect(pinAuthService.verifyPinAndLogAction).toHaveBeenCalledWith(
      dto,
      "merchant-1",
      "10.0.0.1",
    );
  });

  it("uses x-active-staff-id header when body staffId is missing", async () => {
    const dto = {
      pin: "1234",
      action: "payment.refund",
    };
    const user = { merchantId: "merchant-1" };
    const req = {
      connection: { remoteAddress: "10.0.0.2" },
      headers: { "x-active-staff-id": ["staff-header", "ignored"] },
    };
    const expectedResult = {
      success: true,
      staff: {
        id: "staff-header",
        firstName: "Test",
        lastName: "User",
        accessLevel: 1,
        role: "STAFF",
      },
    };
    pinAuthService.verifyPinAndLogAction.mockResolvedValue(expectedResult);

    const result = await controller.verifyAction(dto as any, user, req);

    expect(result).toEqual(expectedResult);
    expect(pinAuthService.verifyPinAndLogAction).toHaveBeenCalledWith(
      { ...dto, staffId: "staff-header" },
      "merchant-1",
      "10.0.0.2",
    );
  });

  it("returns 400 when neither body staffId nor x-active-staff-id header are present", async () => {
    const dto = {
      pin: "1234",
      action: "payment.refund",
    };
    const user = { merchantId: "merchant-1" };
    const req = { ip: "10.0.0.3", headers: {} };

    await expect(controller.verifyAction(dto as any, user, req)).rejects.toThrow(
      new BadRequestException(
        "staffId is required (request body or x-active-staff-id header)",
      ),
    );
    expect(pinAuthService.verifyPinAndLogAction).not.toHaveBeenCalled();
  });
});
