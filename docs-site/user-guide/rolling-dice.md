---
sidebar_position: 4
title: Rolling dice
---

# Rolling dice

You can roll dice without learning any commands. Open the dice roller in one of two ways:

- Click the **🎲 dice button** next to *Send* in the chat.
- Open **View → Dice** for a panel you can dock next to the map and keep open.

Both work the same way, and the result appears in chat as a normal roll for everyone to see.

## Building a roll

1. **Pick dice.** Click a die (d4, d6, d8, d10, d12, d20, d100 or dF) to add one; click it again to add more. Right-click a die to remove one, or press **Clear** to start over.
2. **Add a modifier.** Use **−** / **+** or type a number, e.g. `+5` for a skill bonus.
3. **Advantage / disadvantage.** With a single d20 in the pool, choose *Advantage* (roll two d20s, keep the higher) or *Disadvantage* (keep the lower).
4. Press **Roll**.

## More options

Click **More options** for:

| Option | What it does | Example |
|---|---|---|
| **Keep / drop** | Keep or drop the highest or lowest dice. | Roll 4d6 and drop the lowest for an ability score. |
| **Exploding dice** | A die that rolls its highest face is rolled again and added. | 3d6 where every 6 rolls again. |
| **Count successes / failures** | Instead of adding the dice up, count how many are above, below or equal to a target. | 10d10, count successes above 7. |

Keep/drop and counting work with one type of die at a time. If an option is greyed out, the roller tells you why.

dF is a Fudge/Fate die: each one shows −1, 0 or +1.

## Learning the chat command

Under the dice, the roller shows the chat command it will send, for example `/r 2d20kh1+5`. You can type the same thing in chat yourself. Once you know the commands, typing is often faster.

| You want | Type |
|---|---|
| One d20 plus 5 | `/r 1d20+5` |
| Advantage | `/r 2d20kh1+5` |
| Disadvantage | `/r 2d20kl1+5` |
| 4d6, drop the lowest | `/r 4d6dl1` |
| Exploding d6s | `/r 3d6!` |
| Count successes above 7 | `/r 10d10cs>7` |
| Fate dice | `/r 4dF` |
