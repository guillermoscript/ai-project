import { Access } from "payload/config";
import { User } from "payload/generated-types";

export const isAdminOrSelf: Access<any, User> = async ({ req: { user, payload } }) => {
  if (!user) {
    return false;
  }
  if (typeof user === 'string') {
    const userDoc = await payload.findByID({
      collection: 'users',
      id: user,
    });

    if (userDoc?.roles.includes('admin')) {
      return true;
    }
    return {
      user: {
        equals: user,
      },
    }
  } else {
    if (user?.roles.includes('admin')) {
      return true;
    }
    return {
      user: {
        equals: user.id,
      },
    }
  }
};