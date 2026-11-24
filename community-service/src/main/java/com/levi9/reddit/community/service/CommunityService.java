package com.levi9.reddit.community.service;

import com.levi9.reddit.community.dto.CommunityDTO;
import com.levi9.reddit.community.dto.CommunityDetailDTO;
import com.levi9.reddit.community.dto.CommunitySort;
import com.levi9.reddit.community.dto.InternalCommunityDTO;
import com.levi9.reddit.community.dto.PageDTO;
import com.levi9.reddit.community.entity.Community;
import com.levi9.reddit.community.exception.CommunityNotFoundException;
import com.levi9.reddit.community.exception.ConflictException;
import com.levi9.reddit.community.exception.ErrorType;
import com.levi9.reddit.community.repository.CommunityRepository;
import java.util.function.Function;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CommunityService {
    // A second key breaks ties, so two rows with the same value never swap places between pages.
    private static final Sort NEWEST_FIRST = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));
    private static final Sort MOST_MEMBERS_FIRST = Sort.by(Sort.Order.desc("memberCount"), Sort.Order.desc("id"));

    private final CommunityRepository communities;

    /**
     * Active communities only.
     *
     * @param sort ordering, see {@link CommunitySort}
     * @param name only communities whose name contains this text, or {@code null}/blank for all
     */
    @Transactional(readOnly = true)
    public PageDTO<CommunityDTO> findCommunities(CommunitySort sort, String name, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, sortOf(sort));
        String filter = name == null || name.isBlank() ? null : name.strip();

        Page<Community> result = filter == null
                ? communities.findByActiveTrue(pageable)
                : communities.findByActiveTrueAndNameContainingIgnoreCase(filter, pageable);

        return toPage(result, community -> new CommunityDTO(community.getName(), community.getMemberCount()));
    }

    private static Sort sortOf(CommunitySort sort) {
        return switch (sort) {
            case NEW -> NEWEST_FIRST;
            case TOP -> MOST_MEMBERS_FIRST;
        };
    }

    @Transactional(readOnly = true)
    public CommunityDetailDTO getCommunity(String name) {
        Community community = communities.findActiveByName(name)
                .orElseThrow(() -> new CommunityNotFoundException(name));
        return new CommunityDetailDTO(
                community.getId(),
                community.getName(),
                community.getDescription(),
                community.getMemberCount(),
                community.getCreatedAt());
    }

    /** Internal lookup by id: a missing or inactive community is a 404 to the caller. */
    @Transactional(readOnly = true)
    public InternalCommunityDTO getActiveById(long id) {
        Community community = communities.findById(id)
                .filter(Community::isActive)
                .orElseThrow(() -> new CommunityNotFoundException(id));
        return new InternalCommunityDTO(community.getName(), community.isActive());
    }

    @Transactional
    public CommunityDetailDTO create(String name, String description, long creatorId) {
        if (communities.findByName(name).isPresent()) {
            throw new ConflictException(ErrorType.COMMUNITY_NAME_TAKEN, "Community name is already taken: " + name);
        }
        Community community = new Community(name, creatorId);
        community.updateDescription(description);
        try {
            Community saved = communities.save(community);
            communities.flush(); // surface a concurrent duplicate here, where we can map it to 409
            return detail(saved);
        } catch (DataIntegrityViolationException ex) {
            throw new ConflictException(ErrorType.COMMUNITY_NAME_TAKEN, "Community name is already taken: " + name);
        }
    }

    @Transactional
    public void updateDescription(String name, String description) {
        findForAdmin(name).updateDescription(description);
    }

    @Transactional
    public void deactivate(String name) {
        findForAdmin(name).deactivate();
    }

    @Transactional
    public void reactivate(String name) {
        findForAdmin(name).reactivate();
    }

    private Community findForAdmin(String name) {
        return communities.findByName(name)
                .orElseThrow(() -> new CommunityNotFoundException(name));
    }

    private static CommunityDetailDTO detail(Community community) {
        return new CommunityDetailDTO(
                community.getId(),
                community.getName(),
                community.getDescription(),
                community.getMemberCount(),
                community.getCreatedAt());
    }

    private static <E, R> PageDTO<R> toPage(Page<E> page, Function<E, R> mapper) {
        return new PageDTO<>(
                page.getContent().stream().map(mapper).toList(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages());
    }
}
