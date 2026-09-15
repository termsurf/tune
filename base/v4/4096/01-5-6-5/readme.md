# 5:6:5 = 16


```text
CVC   1280
CVCC  1536
CCVC  1280
      4096 = 2^12, so a base word is twelve bits
```

How each shape reaches its number:

- **CVC** at 1280: 2 closings go; the breath opens a quarter of the words it could; an even sieve keeping 4 of 5
- **CVCC** at 1536: c and C open half the words they could; an even sieve keeping 2 of 3
- **CCVC** at 1280: c or C closes a word opening on a cluster a quarter of the time; no word opens and closes alike (same); an even sieve keeping 4 of 5

After the closeness pass, 775 words stay distinct.

Rebuild with `pnpm --dir deck/tune exec tsx make/v4/code/ratio.ts`.
