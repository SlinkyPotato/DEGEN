module.exports = {
    extends: ['@commitlint/config-conventional'],
    rules: {
        "scope-enum":  [
            2,
            "always",
            [
                "",
                "admin",
                "bounty",
                "changelog",
                "coordinape",
                "help",
                "notion",
                "poap",
                "scoap-squad",
                "timecard"
            ]
        ]
    }
};
