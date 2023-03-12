const PERMISSIONS = {
    ALL: 0,
    VIEW_USERS: 1,
    MANAGE_USERS: 2,
    CREATE_USER: 3,
    VIEW_ROLES: 4,
    CREATE_LIST: 5,
    MANAGE_LISTS: 6,
    VIEW_LISTS: 7,
    VIEW_REPUBLICATIONS: 8,
    MANAGE_REPUBLICATIONS: 9,
    CREATE_REPUBLICATION: 10
};

const ROLES = {
    USER: 0,
    ADMIN: 1
}

const ROLE_VALUES = {
    [ROLES.USER]: {
        id: 0,
        name: "User",
        permissions: []
    },
    [ROLES.ADMIN]: {
        id: 1,
        name: "Admin",
        permissions: [PERMISSIONS.ALL]
    }
}

module.exports = { ROLES, PERMISSIONS, ROLE_VALUES }