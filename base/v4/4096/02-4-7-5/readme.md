# 4:7:5 = 16

```text
CVC   1024
CVCC  1792
CCVC  1280
      4096 = 2^12, so a base word is twelve bits
```

**Built so that no hand written meaning is lost.** Every legal v4
word that `tune.csv` gives a meaning to is in this system, all
1,219 of them. The rest of each shape is filled by
the frequency picker, which leans toward the sounds a language
actually uses and corrects for whatever the kept words are heavy in.

The counts are fixed by construction rather than searched for, so
there is no sieve here and no ration. Those exist to land on a
number; taking exactly the number wanted lands on it directly.

| shape | words | of those, already meant something |
| :--- | ---: | ---: |
| `CVC` | 1024 | 648 |
| `CVCC` | 1792 | 269 |
| `CCVC` | 1280 | 302 |

Sound drift from the wanted frequency shape is 0.841 points.

Rebuild with `pnpm --dir deck/tune v4:keep`.
