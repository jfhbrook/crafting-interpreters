#ifndef clox_vm_h
#define clox_vm_h

#include "object.h"
#include "table.h"
#include "value.h"

#define FRAMES_MAX 64
#define STACK_MAX (FRAMES_MAX * UINT8_COUNT)
#define MAX_HANDLER_FRAMES 16

typedef struct {
  uint16_t handlerAddress;
  uint16_t finallyAddress;
  Value cls;
} ExceptionHandler;

typedef struct {
  ObjClosure *closure;
  uint8_t *ip;
  Value *slots;
  uint8_t handlerCount;
  ExceptionHandler handlerStack[MAX_HANDLER_FRAMES];
} CallFrame;

typedef struct {
  CallFrame frames[FRAMES_MAX];
  int frameCount;
  Value stack[STACK_MAX];
  Value *stackTop;
  Table globals;
  // A table of interned strings. The keys store the strings - we're using
  // the table like a set, not a map.
  Table strings;
  ObjString *initString;
  ObjUpvalue *openUpvalues;

  size_t bytesAllocated;
  size_t nextGC;
  Obj *objects;

  // A stack of gray values, for garbage collection purposes.
  int grayCount;
  int grayCapacity;
  Obj **grayStack;
} VM;

typedef enum {
  INTERPRET_OK,
  INTERPRET_COMPILE_ERROR,
  INTERPRET_RUNTIME_ERROR
} InterpretResult;

extern VM vm;

void initVM();
void freeVM();
InterpretResult interpret(const char *source);
void push(Value value);
Value pop();

#endif
