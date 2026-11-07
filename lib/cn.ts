// Plain (non-client) module so both server and client components can call it.
export const cn = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");
