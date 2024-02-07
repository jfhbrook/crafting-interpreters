cmake_minimum_required(VERSION 3.10)

project(clox VERSION 1.0)

set(C_STANDARD 23)

include_directories(src)

if(DEFINED ENV{NAN_BOXING})
  add_compile_definitions(NAN_BOXING)
endif(DEFINED ENV{NAN_BOXING})

if(CMAKE_BUILD_TYPE MATCHES Debug)
  if(DEFINED ENV{DEBUG_STRESS_GC})
    add_compile_definitions(DEBUG_STRESS_GC)
  endif(DEFINED ENV{DEBUG_STRESS_GC})

  if(DEFINED ENV{DEBUG_PRINT_CODE})
    add_compile_definitions(DEBUG_PRINT_CODE)
  endif(DEFINED ENV{DEBUG_PRINT_CODE})

  if(DEFINED ENV{DEBUG_TRACE_EXECUTION})
    add_compile_definitions(DEBUG_TRACE_EXECUTION)
  endif(DEFINED ENV{DEBUG_TRACE_EXECUTION})

  if(DEFINED ENV{DEBUG_LOG_GC})
    add_compile_definitions(DEBUG_LOG_GC)
  endif(DEFINED ENV{DEBUG_LOG_GC})
endif(CMAKE_BUILD_TYPE MATCHES Debug)

add_library(memory src/memory.c)

add_library(value src/value.c)
target_link_libraries(value PRIVATE memory)
target_link_libraries(value PRIVATE object)

add_library(table src/table.c)

add_library(object src/object.c)
target_link_libraries(object PRIVATE chunk)
target_link_libraries(object PRIVATE table)

add_library(chunk src/chunk.c)

add_library(debug_ src/debug.c)
target_link_libraries(value PRIVATE object)
target_link_libraries(debug_ PRIVATE value)

add_library(scanner src/scanner.c)

add_library(compiler src/compiler.c)
target_link_libraries(compiler PRIVATE scanner)
target_link_libraries(compiler PRIVATE debug_)

add_library(vm src/vm.c)
target_link_libraries(vm PRIVATE compiler)
target_link_libraries(vm PRIVATE chunk)
target_link_libraries(vm PRIVATE table)

add_executable(clox src/main.c)
set_target_properties(clox PROPERTIES RUNTIME_OUTPUT_DIRECTORY bin)
target_link_libraries(clox PRIVATE vm)
