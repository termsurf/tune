# 1:2:1 = 4


```text
CVC   1024
CVCC  2048
CCVC  1024
      4096 = 2^12, so a base word is twelve bits
```

How each shape reaches its number:

- **CVC** at 1024: a hush or a tooth sound closes a three letter word three quarters of the time; no word opens and closes alike (similar); an even sieve keeping 2 of 3
- **CVCC** at 2048: 2 other closings go; a liquid opens a word closing on a cluster a quarter of the time
- **CCVC** at 1024: 1 onset clusters go; a voiceless stop stands second in an opening cluster three quarters of the time; an even sieve keeping 3 of 5

After the closeness pass, 754 words stay distinct.

Rebuild with `pnpm --dir deck/tune exec tsx make/v4/code/ratio.ts`.
