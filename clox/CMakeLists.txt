cmake_minimum_required(VERSION 3.10)

project(clox VERSION 1.0)

set(C_STANDARD 23)

include_directories(src)

add_library(memory src/memory.c)

add_library(chunk src/chunk.c)
target_link_libraries(chunk PRIVATE memory)

add_library(debug_ src/debug.c)

add_executable(clox src/main.c)
set_target_properties(clox PROPERTIES RUNTIME_OUTPUT_DIRECTORY bin)
target_link_libraries(clox PRIVATE chunk)
target_link_libraries(clox PRIVATE debug_)
