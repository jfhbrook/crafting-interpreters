#include "memory.h"
#include "compiler.h"

#include <stdlib.h>

#include "vm.h"

#ifdef DEBUG_LOG_GC
#include "debug.h"
#include <stdio.h>
#endif

#define GC_HEAP_GROW_FACTOR 2

void *reallocate(void *pointer, size_t oldSize, size_t newSize) {
  vm.bytesAllocated += newSize - oldSize;
  if (newSize > oldSize) {
#ifdef DEBUG_STRESS_GC
    collectGarbage();
#endif

    if (vm.bytesAllocated > vm.nextGC) {
      collectGarbage();
    }
  }

  if (newSize == 0) {
    free(pointer);
    return NULL;
  }

  void *result = realloc(pointer, newSize);
  if (result == NULL)
    exit(1);
  return result;
}

void markObject(Obj *object) {
  if (object == NULL)
    return;
  if (object->isMarked)
    return;
#ifdef DEBUG_LOG_GC
  printf("%p mark ", (void *)object);
  printValue(OBJ_VAL(object));
  printf("\n");
#endif

  object->isMarked = true;

  // push the object onto the gray stack, since we haven't traversed its
  // children
  if (vm.grayCapacity < vm.grayCount + 1) {
    vm.grayCapacity = GROW_CAPACITY(vm.grayCapacity);
    // Call system realloc, since the gray stack's memory is managed manually
    // and is NOT garbage collected
    vm.grayStack =
        (Obj **)realloc(vm.grayStack, sizeof(Obj *) * vm.grayCapacity);
    // Make sure there isn't an allocation failure. In practice, we would do
    // something more graceful than hard exit.
    if (vm.grayStack == NULL)
      exit(1);
  }

  vm.grayStack[vm.grayCount++] = object;
}

void markValue(Value value) {
  // non-objects (numbers, booleans, nil) aren't objects and don't involve
  // the heap
  if (IS_OBJ(value))
    markObject(AS_OBJ(value));
}

void markArray(ValueArray *array) {
  for (int i = 0; i < array->count; i++) {
    markValue(array->values[i]);
  }
}

static void blackenObject(Obj *object) {
#ifdef DEBUG_LOG_GC
  printf("%p blacken ", (void *)object);
  printValue(OBJ_VAL(object));
  printf("\n");
#endif
  switch (object->type) {
  case OBJ_BOUND_METHOD: {
    ObjBoundMethod *bound = (ObjBoundMethod *)object;
    markValue(bound->receiver);
    markObject((Obj *)bound->method);
    break;
  }
  case OBJ_CLASS: {
    ObjClass *cls = (ObjClass *)object;
    markObject((Obj *)cls->name);
    markTable(&cls->methods);
    break;
  }
  case OBJ_CLOSURE: {
    ObjClosure *closure = (ObjClosure *)object;
    // Mark the function we closed on
    markObject((Obj *)closure->function);
    // Mark the closure's upvalues
    for (int i = 0; i < closure->upvalueCount; i++) {
      markObject((Obj *)closure->upvalues[i]);
    }
    break;
  }
  case OBJ_FUNCTION: {
    ObjFunction *function = (ObjFunction *)object;
    // The name of the function is a string object
    markObject((Obj *)function->name);
    // The function's constants are various objects
    markArray(&function->chunk.constants);
    break;
  }
  case OBJ_INSTANCE: {
    ObjInstance *instance = (ObjInstance *)object;
    markObject((Obj *)instance->cls);
    markTable(&instance->fields);
    break;
  }
  case OBJ_UPVALUE:
    // marked the upvalue's closed-over value
    markValue(((ObjUpvalue *)object)->closed);
    break;
  // No outgoing references here! Note "black" objects have been marked and
  // aren't in the gray stack - we don't need to track blackened objects
  // otherwise
  case OBJ_NATIVE:
  case OBJ_STRING:
    break;
  }
}

static void freeObject(Obj *object) {
#ifdef DEBUG_LOG_GC
  printf("%p free type %d\n", (void *)object, object->type);
#endif
  switch (object->type) {
  case OBJ_BOUND_METHOD:
    FREE(ObjBoundMethod, object);
    break;
  case OBJ_CLASS: {
    ObjClass *cls = (ObjClass *)object;
    freeTable(&cls->methods);
    FREE(ObjClass, object);
    break;
  }
  case OBJ_CLOSURE: {
    ObjClosure *closure = (ObjClosure *)object;
    // Doesn't own the upvalues themselves, just the array
    FREE_ARRAY(ObjUpvalue *, closure->upvalues, closure->upvalueCount);
    FREE(ObjClosure, object);
    break;
  }
  case OBJ_FUNCTION: {
    ObjFunction *function = (ObjFunction *)object;
    freeChunk(&function->chunk);
    FREE(ObjFunction, object);
    break;
  }
  case OBJ_INSTANCE: {
    ObjInstance *instance = (ObjInstance *)object;
    freeTable(&instance->fields);
    FREE(ObjInstance, object);
    break;
  }
  case OBJ_NATIVE: {
    FREE(ObjNative, object);
    break;
  }
  case OBJ_STRING: {
    ObjString *string = (ObjString *)object;
    FREE_ARRAY(char, string->chars, string->length + 1);
    FREE(ObjString, object);
    break;
  }
  case OBJ_UPVALUE:
    // Note, we don't free the variable itself
    FREE(ObjUpvalue, object);
    break;
  }
}

static void markRoots() {
  // mark values in the stack
  for (Value *slot = vm.stack; slot < vm.stackTop; slot++) {
    markValue(*slot);
  }

  // mark closure objects stored in open frames
  for (int i = 0; i < vm.frameCount; i++) {
    markObject((Obj *)vm.frames[i].closure);
  }

  // mark open upvalue objects
  // (closed upvalues are accessible through the closure)
  for (ObjUpvalue *upvalue = vm.openUpvalues; upvalue != NULL;
       upvalue = upvalue->next) {
    markObject((Obj *)upvalue);
  }

  // mark global variables
  markTable(&vm.globals);

  // values held by a running compiler, such as literals and constants
  markCompilerRoots();
  markObject((Obj *)vm.initString);
}

static void traceReferences() {
  while (vm.grayCount > 0) {
    Obj *object = vm.grayStack[--vm.grayCount];
    blackenObject(object);
  }
}

static void sweep() {
  Obj *previous = NULL;
  Obj *object = vm.objects;

  // Iterate over all objects
  while (object != NULL) {
    if (object->isMarked) {
      // Object is marked, we wanna keep it

      // reset so we get clean state the next time we markensweep
      object->isMarked = false;
      previous = object;
      object = object->next;
    } else {
      // Object is unreachable because we didn't mark it
      Obj *unreached = object;
      // Pull the unreached object out of the linked list of objects
      object = object->next;
      if (previous != NULL) {
        previous->next = object;
      } else {
        vm.objects = object;
      }

      // FREEDOM!!!
      freeObject(unreached);
    }
  }
}

void collectGarbage() {
#ifdef DEBUG_LOG_GC
  printf("-- gc begin\n");
  size_t before = vm.bytesAllocated;
#endif

  markRoots();
  traceReferences();
  tableRemoveWhite(&vm.strings);
  sweep();

  // Do a GC after the heap is twice as big as it is after this GC
  vm.nextGC = vm.bytesAllocated * GC_HEAP_GROW_FACTOR;

#ifdef DEBUG_LOG_GC
  printf("-- gc end\n");
  printf("   collected %zu bytes (from %zu to %zu) next at %zu\n",
         before - vm.bytesAllocated, before, vm.bytesAllocated, vm.nextGC);
#endif
}

// Free every object on the VM
void freeObjects() {
  Obj *object = vm.objects;
  while (object != NULL) {
    Obj *next = object->next;
    freeObject(object);
    object = next;
  }
  free(vm.grayStack);
}
