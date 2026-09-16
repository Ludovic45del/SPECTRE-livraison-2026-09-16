"""Shared mixins for API controllers."""

from django.core.serializers.json import DjangoJSONEncoder
from django.http import JsonResponse


class LazyRepositoryList:
    """Wrapper that translates DRF slicing and counting into repository method calls.
    Allows passing a lazy list to DRF PageNumberPagination so it queries only the needed page.
    """

    def __init__(self, fetch_func, count_func):
        self.fetch_func = fetch_func
        self.count_func = count_func

    def count(self):
        return self.count_func()

    def __len__(self):
        return self.count_func()

    def __getitem__(self, k):
        if isinstance(k, slice):
            limit = None if k.stop is None else (k.stop - (k.start or 0))
            offset = k.start or 0
            return self.fetch_func(limit=limit, offset=offset)
        raise TypeError("LazyRepositoryList only supports slices")


class PaginatedControllerMixin:
    """Mixin providing optional pagination for list endpoints.

    Requires self.paginator to be set (a PageNumberPagination instance).
    """

    def paginate_or_json(
        self, request, source_data, mapper=lambda x: x
    ) -> JsonResponse:
        """Return paginated response if ?page= is present, else full list.

        Args:
            request: The DRF Request.
            source_data: A python list OR a LazyRepositoryList.
            mapper: Optional function to map beans to dicts *after* pagination.
        """
        page = request.query_params.get("page")
        if page is not None:
            # paginated will be a sliced sublist of source_data
            paginated = self.paginator.paginate_queryset(source_data, request)
            if paginated is not None:
                mapped_data = [mapper(item) for item in paginated]
                return self.paginator.get_paginated_response(mapped_data)

        # Unpaginated fallback
        if isinstance(source_data, LazyRepositoryList):
            all_data = source_data.fetch_func(limit=None, offset=0)
        else:
            all_data = source_data

        mapped_data = [mapper(item) for item in all_data]
        return JsonResponse(mapped_data, safe=False, encoder=DjangoJSONEncoder)
