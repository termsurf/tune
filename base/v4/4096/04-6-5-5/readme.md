# 6:5:5 = 16


```text
CVC   1536
CVCC  1280
CCVC  1280
      4096 = 2^12, so a base word is twelve bits
```

How each shape reaches its number:

- **CVC** at 1536: 3 closings go; x opens three quarters of the words it could
- **CVCC** at 1280: 1 liquid closings go; a voiced stop opens a word closing on a cluster a quarter of the time; an even sieve keeping 3 of 5
- **CCVC** at 1280: c or C closes a word opening on a cluster a quarter of the time; no word opens and closes alike (same); an even sieve keeping 4 of 5

After the closeness pass, 720 words stay distinct.

Rebuild with `pnpm --dir deck/tune exec tsx make/v4/code/ratio.ts`.
