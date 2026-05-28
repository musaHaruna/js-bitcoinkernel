cmake_minimum_required(VERSION 3.22)

project(js_bitcoin_kernel)

include(ExternalProject)

set(BITCOIN_SOURCE_DIR
    ${CMAKE_CURRENT_SOURCE_DIR}/depend/bitcoin
)

if(NOT EXISTS "${BITCOIN_SOURCE_DIR}/CMakeLists.txt")
    message(FATAL_ERROR
        "Bitcoin Core source not found in depend/bitcoin"
    )
endif()

ExternalProject_Add(bitcoin_core

    SOURCE_DIR
        ${BITCOIN_SOURCE_DIR}

    BINARY_DIR
        ${CMAKE_BINARY_DIR}/bitcoin-build

    CMAKE_ARGS
        -DBUILD_SHARED_LIBS=ON
        -DBUILD_KERNEL_LIB=ON
        -DBUILD_WALLET=OFF
        -DBUILD_GUI=OFF
        -DBUILD_TESTS=OFF
        -DBUILD_UTIL=OFF
        -DBUILD_DAEMON=OFF
        -DBUILD_CLI=OFF
        -DENABLE_WALLET=OFF
        -DCMAKE_BUILD_TYPE=Release

    BUILD_COMMAND
        ${CMAKE_COMMAND}
        --build .
        --target bitcoinkernel
        --config Release

    INSTALL_COMMAND ""
)