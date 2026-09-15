# 3:3:2 = 8


```text
CVC   1536
CVCC  1536
CCVC  1024
      4096 = 2^12, so a base word is twelve bits
```

How each shape reaches its number:

- **CVC** at 1536: 3 closings go; x opens three quarters of the words it could
- **CVCC** at 1536: c and C open half the words they could; an even sieve keeping 2 of 3
- **CCVC** at 1024: 1 onset clusters go; a voiceless stop stands second in an opening cluster three quarters of the time; an even sieve keeping 3 of 5

After the closeness pass, 757 words stay distinct.

Rebuild with `pnpm --dir deck/tune exec tsx make/v4/code/ratio.ts`.
