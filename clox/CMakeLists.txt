cmake_minimum_required(VERSION 3.10)

project(clox VERSION 1.0)

set(C_STANDARD 23)

add_library(memory src/memory.c)
add_library(chunk src/chunk.c)
target_link_libraries(chunk PRIVATE memory)

add_executable(clox src/main.c)
target_link_libraries(clox PRIVATE chunk)

set_target_properties(clox PROPERTIES RUNTIME_OUTPUT_DIRECTORY bin)
target_include_directories(clox PRIVATE "${PROJECT_BINARY_DIR}/src")
