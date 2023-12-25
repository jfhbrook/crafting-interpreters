cmake_minimum_required(VERSION 3.10)

project(clox VERSION 1.0)

set(C_STANDARD 23)

include_directories(src)

add_library(memory src/memory.c)

add_library(value src/value.c)
target_link_libraries(value PRIVATE memory)
target_link_libraries(value PRIVATE object)

add_library(object src/object.c)

add_library(chunk src/chunk.c)
target_link_libraries(chunk PRIVATE memory)
target_link_libraries(chunk PRIVATE value)

add_library(debug_ src/debug.c)
target_link_libraries(debug_ PRIVATE memory)
target_link_libraries(debug_ PRIVATE value)

add_library(scanner src/scanner.c)

add_library(compiler src/compiler.c)
target_link_libraries(compiler PRIVATE scanner)
# TODO: How to switch on config def? Can we do that?
target_link_libraries(compiler PRIVATE debug_)

add_library(vm src/vm.c)
target_link_libraries(vm PRIVATE compiler)
target_link_libraries(vm PRIVATE debug_)
target_link_libraries(vm PRIVATE chunk)

add_executable(clox src/main.c)
set_target_properties(clox PROPERTIES RUNTIME_OUTPUT_DIRECTORY bin)
target_link_libraries(clox PRIVATE chunk)
target_link_libraries(clox PRIVATE vm)
