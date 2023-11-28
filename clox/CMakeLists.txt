cmake_minimum_required(VERSION 3.10)

project(clox VERSION 1.0)

set(C_STANDARD 23)

add_executable(clox src/main.c)

set_target_properties(clox PROPERTIES RUNTIME_OUTPUT_DIRECTORY bin)

target_include_directories(clox PUBLIC "${PROJECT_BINARY_DIR}/src")
