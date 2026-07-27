package com.example.app.payroll.service;

import com.example.app.common.dto.PageMeta;
import com.example.app.common.dto.PageResponse;
import com.example.app.common.dto.ResponseMeta;
import com.example.app.common.dto.SourceConfidence;
import com.example.app.common.exception.ErrorDetail;
import com.example.app.common.exception.NotFoundException;
import com.example.app.common.exception.ValidationException;
import com.example.app.payroll.domain.PayPeriod;
import com.example.app.payroll.dto.PayPeriodDto;
import com.example.app.payroll.dto.PayPeriodResponse;
import com.example.app.payroll.repository.PayPeriodRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Read-only side of the Payroll Context's Pay Period aggregate
 * (11_API_CONTRACT_SPECIFICATION.md §4: "GET /pay-periods, GET /pay-periods/{id}
 * ... stubbed here as required contract slots because the value streams are
 * confirmed to exist ... but no package, table, or rule detail backs them.").
 * There is deliberately no create/update/delete here: the contract names no
 * mutating pay-period endpoint, and inventing one would exceed this sprint's
 * explicit "placeholder contract shape only" mandate.
 *
 * <p>ADMIN-only, same default-secure posture as Employee's compensation-adjacent
 * operations (salary_band on PATCH /employees/{id}) -- pay-period data is
 * financial and no source evidence describes a broader read audience.
 */
@Service
@RequiredArgsConstructor
public class PayPeriodService {

    private static final int DEFAULT_PAGE_LIMIT = 20;
    private static final int MAX_PAGE_LIMIT = 100;

    private final PayPeriodRepository payPeriodRepository;

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public PageResponse<PayPeriodDto> list(String cursor, Integer limit) {
        int pageSize = clampLimit(limit);
        int pageNumber = parseCursor(cursor);

        Page<PayPeriod> page = payPeriodRepository.findAll(
            PageRequest.of(pageNumber, pageSize, Sort.by(Sort.Direction.ASC, "startDate")));

        List<PayPeriodDto> data = page.getContent().stream().map(PayPeriodDto::from).toList();
        String nextCursor = page.hasNext() ? String.valueOf(pageNumber + 1) : null;
        return new PageResponse<>(data, new PageMeta(nextCursor, pageSize, (int) page.getTotalElements()));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public PayPeriodResponse getById(Long payPeriodId) {
        PayPeriod payPeriod = payPeriodRepository.findById(payPeriodId).orElseThrow(() -> notFound(payPeriodId));
        return new PayPeriodResponse(PayPeriodDto.from(payPeriod), new ResponseMeta(SourceConfidence.LOW));
    }

    private NotFoundException notFound(Long payPeriodId) {
        return new NotFoundException("PAY_PERIOD_NOT_FOUND", "No pay period found with id " + payPeriodId);
    }

    private int clampLimit(Integer limit) {
        if (limit == null) {
            return DEFAULT_PAGE_LIMIT;
        }
        return Math.min(Math.max(limit, 1), MAX_PAGE_LIMIT);
    }

    private int parseCursor(String cursor) {
        if (cursor == null || cursor.isBlank()) {
            return 0;
        }
        try {
            int page = Integer.parseInt(cursor);
            if (page < 0) {
                throw new NumberFormatException("negative cursor");
            }
            return page;
        } catch (NumberFormatException e) {
            throw new ValidationException("Invalid cursor",
                List.of(new ErrorDetail("cursor", "must be a non-negative page cursor")));
        }
    }
}
