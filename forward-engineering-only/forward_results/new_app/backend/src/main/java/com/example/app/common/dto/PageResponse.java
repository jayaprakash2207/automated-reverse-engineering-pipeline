package com.example.app.common.dto;

import java.util.List;

/** 11_API_CONTRACT_SPECIFICATION.md §1 standard list envelope. */
public record PageResponse<T>(List<T> data, PageMeta page) {
}
