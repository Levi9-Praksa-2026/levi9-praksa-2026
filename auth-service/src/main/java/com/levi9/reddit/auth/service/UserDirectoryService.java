package com.levi9.reddit.auth.service;

import com.levi9.reddit.auth.dto.AdminUserDTO;
import com.levi9.reddit.auth.dto.PageDTO;
import com.levi9.reddit.auth.entity.UserRole;
import com.levi9.reddit.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserDirectoryService {
    private final UserRepository users;

    @Transactional(readOnly = true)
    public PageDTO<AdminUserDTO> list(String query, String status, UserRole role, int page, int size) {
        String pattern = query == null || query.isBlank() ? null
                : "%" + query.strip().toLowerCase(java.util.Locale.ROOT)
                        .replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
        var results = users.findForAdmin(pattern, status, role,
                PageRequest.of(page, size, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"))));
        var content = results.getContent().stream().map(u -> new AdminUserDTO(u.getId(), u.getUsername(),
                u.getEmail(), u.getFirstName(), u.getLastName(), u.getRole(), u.isBanned(), u.isDeleted(),
                u.getBanReason(), u.getBannedAt(), u.getCreatedAt())).toList();
        return new PageDTO<>(content, results.getNumber(), results.getSize(), results.getTotalElements(), results.getTotalPages());
    }
}
