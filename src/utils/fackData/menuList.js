export const menuList = [
    {
        id: 0,
        name: "dashboard",
        path: "/",
        icon: 'feather-airplay',
        dropdownMenu: []
    },
    {
        id: 1,
        name: "POS",
        path: "/pos",
        icon: 'feather-monitor',
        dropdownMenu: []
    },
    {
        id: 2,
        name: "Orders",
        path: "/orders/list",
        icon: 'feather-shopping-bag',
        dropdownMenu: []
    },
    {
        id: 3,
        name: "Products",
        path: "#",
        icon: 'feather-grid',
        dropdownMenu: [
            {
                id: 1,
                name: "Category",
                path: "/category/list",
                subdropdownMenu: false
            },
            {
                id: 2,
                name: "Item",
                path: "/item/list",
                subdropdownMenu: false
            },
            {
                id: 3,
                name: "Deal",
                path: "/deal/list",
                subdropdownMenu: false
            },
        ]
    },
    {
        id: 4,
        name: "Customers",
        path: "/customer/list",
        icon: 'feather-users',
        dropdownMenu: []
    },
    {
        id: 5,
        name: "Discounts",
        path: "/discount/list",
        icon: 'feather-send',
        dropdownMenu: []
    },
    {
        id: 6,
        name: "Marketing",
        path: "#",
        icon: 'feather-mail',
        dropdownMenu: [
            {
                id: 1,
                name: "Email Marketing",
                path: "/marketing/list",
                subdropdownMenu: false
            },
            {
                id: 2,
                name: "Marketing Template",
                path: "/template/list",
                subdropdownMenu: false
            },
        ]
    },
    {
        id: 8,
        name: "Inventory",
        path: "/inventory/list",
        icon: 'feather-layers',
        dropdownMenu: []
    },
    {
        id: 9,
        name: "Finance",
        path: "/finance",
        icon: 'feather-dollar-sign',
        dropdownMenu: []
    },
    {
        id: 10,
        name: "Analytics",
        path: "#",
        icon: 'feather-bar-chart-2',
        dropdownMenu: [
            {
                id: 1,
                name: "Sales Analytics",
                path: "/analytics/sales",
                subdropdownMenu: false
            },
            {
                id: 2,
                name: "Product Analytics",
                path: "/analytics/product",
                subdropdownMenu: false
            },
            {
                id: 3,
                name: "Customer Analytics",
                path: "/analytics/customer",
                subdropdownMenu: false
            },
            {
                id: 4,
                name: "Financial Analytics",
                path: "/analytics/financial",
                subdropdownMenu: false
            },
            {
                id: 5,
                name: "Team Analytics",
                path: "/analytics/team",
                subdropdownMenu: false
            },
            {
                id: 6,
                name: "Comparison Analytics",
                path: "/analytics/comparison",
                subdropdownMenu: false
            },
            {
                id: 7,
                name: "Reports",
                path: "/reports",
                subdropdownMenu: false
            },
        ]
    },
    {
        id: 11,
        name: "Users",
        path: "#",
        icon: 'feather-users',
        dropdownMenu: [
            {
                id: 1,
                name: "Team",
                path: "/team/list",
                subdropdownMenu: false
            },
            {
                id: 2,
                name: "Role",
                path: "/role/list",
                subdropdownMenu: false
            }
        ]
    },
    {
        id: 12,
        name: "Online Store",
        path: "/Store/settings",
        icon: 'feather-shopping-cart',
        dropdownMenu: []
    },
]