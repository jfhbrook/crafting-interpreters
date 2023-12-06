# crafting interpreters

this repo is the results of me working throgh <https://craftinginterpreters.com>.

it will have two projects:

- tslox - the java half of things, ported to typescript
- clox - the C half of things, written in C

I used typescript cause I know it better and porting from java isn't a big deal.

I'm sticking with the C though because rust is *too* high level and it will
annoy me to hand-roll native rust data structures. plus, I need to get better
at C.

## notes

should write my basic in typescript first, then port to rust later:

- better dynamic interface driven support
- easier to cheese errors until I know what interface I want
- can develop test suite and architecture to target
- can follow structure of Crafting Interpreters instead of jumping straight to
  VM
